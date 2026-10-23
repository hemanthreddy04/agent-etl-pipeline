import re
import json
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import save_project_to_bq

def run_erd_agent(project_id: str, relationships: list, feedback: str, schemas: dict, eda_context: str, existing_mermaid: str = "") -> str:
    raw_schemas = schemas or {}
    
    # Helper to sanitize identifiers for Mermaid compatibility
    def sanitize(name: str) -> str:
        clean = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        if clean and clean[0].isdigit():
            clean = "_" + clean
        return clean

    def sanitize_type(t_name: str) -> str:
        clean = re.sub(r'[^a-zA-Z0-9_]', '_', t_name)
        return clean if clean else "string"

    def sanitize_label(label: str) -> str:
        clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', label)
        if len(clean) > 40:
            clean = clean[:37] + "..."
        return clean.strip()
    
    sanitized_schemas = {}
    for table_name, columns in raw_schemas.items():
        san_table = sanitize(table_name).upper()
        sanitized_schemas[san_table] = []
        for col in columns:
            sanitized_schemas[san_table].append({
                "name": sanitize(col.get("name", "")).lower(),
                "type": sanitize_type(col.get("type", "string")).lower()
            })

    sanitized_relationships = []
    for r in relationships:
        # Check if r is dict-like
        if hasattr(r, 'get'):
            s_t = r.get("source_table")
            s_k = r.get("source_key")
            t_t = r.get("target_table")
            t_k = r.get("target_key")
            r_t = r.get("relationship_type")
            desc = r.get("description")
        else:
            s_t = getattr(r, 'source_table', '')
            s_k = getattr(r, 'source_key', '')
            t_t = getattr(r, 'target_table', '')
            t_k = getattr(r, 'target_key', '')
            r_t = getattr(r, 'relationship_type', '')
            desc = getattr(r, 'description', '')

        sanitized_relationships.append({
            "source_table": sanitize(s_t or "").upper(),
            "source_key": sanitize(s_k or "").lower(),
            "target_table": sanitize(t_t or "").upper(),
            "target_key": sanitize(t_k or "").lower(),
            "relationship_type": r_t or "",
            "description": sanitize_label(desc or "").lower()
        })

    eda_context_section = ""
    if eda_context:
        eda_context_section = f"""
    The following EDA Blueprint was produced for this dataset. Use the Keys & Join Audit and cardinality findings when drawing relationship arrows:
    --- EDA Blueprint ---
    {eda_context}
    --- End EDA Blueprint ---
    """

    # Build feedback section — include existing diagram when feedback is given
    feedback_section = ""
    if feedback and feedback.strip():
        if existing_mermaid and existing_mermaid.strip():
            feedback_section = f"""
    IMPORTANT: The user has provided feedback to refine the EXISTING ERD diagram below.
    Apply the feedback to modify the existing diagram — keep all unchanged entities and relationships.
    Only add, remove, or modify what the feedback specifies.

    --- EXISTING ERD DIAGRAM ---
{existing_mermaid}
    --- END EXISTING ERD DIAGRAM ---

    USER FEEDBACK: "{feedback}"
    """
        else:
            feedback_section = f'    And this optional feedback: "{feedback}"'

    prompt = f"""
    You are a data modeler. Given these database tables and their schema columns:
    {json.dumps(sanitized_schemas, indent=2)}
    
    And these validated relationship links:
    {json.dumps(sanitized_relationships, indent=2)}
    
    {eda_context_section}
    
    {feedback_section}
    
    Generate a clean, syntactically correct Mermaid.js ERD diagram using the `erDiagram` syntax.
    You MUST format the output exactly like this one-shot example structure:
    
    erDiagram
        direction LR

        CAMPAIGN_DETAILS {{
            string campaign_id PK
            string campaign_name
            string campaign_type
            date start_date
            date end_date
            decimal budget
            decimal total_spent
            int total_impressions
            int total_clicks
            int total_conversions
            string status
        }}

        CAMPAIGN_CHANNELS {{
            string channel_id PK
            string campaign_id PK, FK
            string channel_name
            int impressions
            int clicks
            int conversions
            decimal spend
        }}

        CAMPAIGN_SALES {{
            string sale_id PK
            string campaign_id FK
            string customer_id FK
            string product_name
            int quantity
            decimal revenue
            date sale_date
        }}

        CUSTOMER_ENGAGEMENT {{
            string engagement_id PK
            string customer_id FK
            string campaign_id FK
            string channel_id FK
            string engagement_type
            date engagement_date
        }}

        CUSTOMERS {{
            string customer_id PK
            string customer_name
            string customer_segment
            string region
            string country
        }}

        CAMPAIGN_DETAILS ||--o{{ CAMPAIGN_CHANNELS : has
        CAMPAIGN_DETAILS ||--o{{ CAMPAIGN_SALES : generates
        CAMPAIGN_DETAILS ||--o{{ CUSTOMER_ENGAGEMENT : drives
        CUSTOMERS ||--o{{ CAMPAIGN_SALES : makes
        CUSTOMERS ||--o{{ CUSTOMER_ENGAGEMENT : engages
        CAMPAIGN_CHANNELS ||--o{{ CUSTOMER_ENGAGEMENT : influences

    RULES FOR MERMAID `erDiagram` SYNTAX (STRICT COMPLIANCE REQUIRED):
    - Start directly with `erDiagram`.
    - Put `direction LR` on the second line.
    - Keep all table names in UPPERCASE (e.g., CAMPAIGN_DETAILS).
    - Keep all column names and types in lowercase (e.g., string campaign_id).
    - If a column is both a Primary Key and a Foreign Key, write it exactly as: `PK, FK`.
    - Do NOT write empty entity brackets. Every selected table must list its columns.
    - End relationship lines with a colon and a simple label, wrapped in quotes, e.g., `: "label"`.
    - CRITICAL: Never put unquoted special characters (like parentheses, brackets, colons, or &) inside node labels. Wrap any labels containing spaces or special characters in double quotes.
    - Use standard Crow's Foot notation (e.g., `||--o{{{{`, `||--||`, `}}o--o{{`).
    - Return ONLY the raw Mermaid diagram text block. Do NOT wrap in ```mermaid or include any other text.
    """

    try:
        client = get_genai_client()
        response = generate_content_with_retry(
            client=client,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        raw_text = response.text or ""
        clean_text = raw_text.replace("```mermaid", "").replace("```", "").strip()
        
        erd_idx = clean_text.find("erDiagram")
        if erd_idx != -1:
            clean_text = clean_text[erd_idx:].strip()
        else:
            clean_text = "erDiagram\n" + clean_text
            
        cleaned_lines = []
        in_entity = False
        for line in clean_text.splitlines():
            line_str = line.strip()
            if not line_str:
                continue
            if line_str == "erDiagram":
                cleaned_lines.append(line_str)
                continue
            if line_str.startswith("#") or line_str.startswith("//"):
                continue
            if "--" in line_str or ".." in line_str:
                if ":" not in line_str:
                    line_str = line_str + ' : ""'
                if ":" in line_str:
                    parts = line_str.split(":", 1)
                    label = parts[1].strip()
                    if not (label.startswith('"') and label.endswith('"')):
                        label = f'"{label.replace(chr(34), "")}"'
                    line_str = f"{parts[0].strip()} : {label}"
                cleaned_lines.append(line_str)
                continue
            if line_str.endswith("{"):
                in_entity = True
                cleaned_lines.append(line.rstrip())
                continue
            if line_str == "}":
                in_entity = False
                cleaned_lines.append(line.rstrip())
                continue
            if in_entity:
                line_cleaned = re.sub(r'\b(PK\s*,?\s*FK|FK\s*,?\s*PK)\b', 'PK, FK', line, flags=re.IGNORECASE)
                cleaned_lines.append(line_cleaned.rstrip())
                continue
        clean_text = "\n".join(cleaned_lines)
        
        save_project_to_bq(project_id, {
            "relationships": sanitized_relationships,
            "erd_mermaid": clean_text
        })
        return clean_text
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI ERD diagram generation failed: {str(e)}"
        )
