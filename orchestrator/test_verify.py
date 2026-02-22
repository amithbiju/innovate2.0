"""Quick verification test for the orchestrator modules."""
from project_builder import extract_code_blocks

test_input = """Here is the generated code:

```index.html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Hello</h1></body>
</html>
```

```app.js
console.log("Hello from app");
```

```python
print("this should be skipped - language label")
```

```src/utils.js
export const add = (a, b) => a + b;
```
"""

blocks = extract_code_blocks(test_input)
print(f"Extracted {len(blocks)} code blocks:")
for name, content in blocks:
    print(f"  📄 {name} ({len(content)} chars)")

assert len(blocks) == 3, f"Expected 3 blocks, got {len(blocks)}"
assert blocks[0][0] == "index.html"
assert blocks[1][0] == "app.js"
assert blocks[2][0] == "src/utils.js"
print("✅ extract_code_blocks test PASSED")

# Test FastAPI app creation
from main import app
print(f"✅ FastAPI app created: {app.title}")

# Verify routes exist
routes = [r.path for r in app.routes]
assert "/ingest" in routes, "/ingest route missing"
assert "/review" in routes, "/review route missing"
print(f"✅ Routes verified: {[r for r in routes if not r.startswith('/openapi')]}")

print("\n🎉 All verification tests passed!")
