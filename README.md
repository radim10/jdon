# JDON — JSON-Delimited Object Notation

**JDON** is a compact, LLM-native data format designed for structured data.  
Inspired by JSON, JDON uses **path-based keys** and **columnar arrays** to reduce token usage while remaining human-readable and machine-parsable.

## Key Features

- **LLM-friendly** — predictable patterns and flattened objects make parsing and generation easy for AI models.
- **Token-efficient** — columnar arrays and minimal punctuation drastically reduce token count.
- **Human-readable** — simpler than JSON for large datasets, without deep nesting or unnecessary quotes.
- **Columnar arrays** — perfect for arrays of objects, reducing repetition.

---

## JDON vs JSON

### Example JSON

```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" },
    { "id": 3, "name": "Charlie", "role": "user" }
  ],
  "meta": {
    "version": 2,
    "created": "2025-01-15"
  },
  "tags": ["admin", "dev", "ops"]
}
```

### Example JDON

```jdon
meta:{
  version:2|
  created:2025-01-15
}|
tags:[admin,dev,ops]|
users:[
  id:1,2,3|
  name:Alice,Bob,Charlie|
  role:admin,user,user
]
```

#### Without formatting

```
meta:{version:2|created:2025-01-15}|tags:[admin,dev,ops]|users:[id:1,2,3|name:Alice,Bob,Charlie|role:admin,user,user]
```

#### Columnar Arrays

```jdon
[
  id:emp_001,emp_002,emp_003,emp_004,emp_005|
  name:"Alice Johnson","Bob Smith","Carol White","David Brown","Eve Davis"|
  email:alice.j@company.com,bob.smith@company.com,carol.w@company.com,david.b@company.com,eve.davis@company.com|
  department:Engineering,Marketing,Engineering,Sales,HR|
  salary:95000,72000,103000,68000,81000|
  active:true,true,true,false,true
]
```
