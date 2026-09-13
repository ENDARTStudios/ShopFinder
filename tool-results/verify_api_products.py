#!/usr/bin/env python3
"""Verifica se o seed populou a tabela Product via chamada pública à API."""
import urllib.request, json, sys

OUT = "state/api_verify_result.json"
URL = "https://shop-finder-taupe.vercel.app/api/catalog?path=products&limit=5"

try:
    req = urllib.request.Request(URL, headers={"User-Agent": "Cline-Audit/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        code = resp.status
        data = json.loads(resp.read().decode())
        
        result = {
            "http_code": code,
            "total_products": data.get("total", 0),
            "products_returned": len(data.get("products", [])),
            "sample_slugs": [p.get("slug") for p in data.get("products", [])[:5]],
            "sample_titles": [p.get("title") for p in data.get("products", [])[:5]],
            "timestamp": __import__("datetime").datetime.now().isoformat()
        }
        
        with open(OUT, "w") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"HTTP {code}")
        print(f"Total products (API): {result['total_products']}")
        if result['products_returned'] > 0:
            print(f"Products returned: {result['products_returned']}")
            for s, t in zip(result['sample_slugs'], result['sample_titles']):
                print(f"  - {s}: {t}")
        else:
            print("NO PRODUCTS RETURNED - seed may not have worked")
            
except Exception as e:
    result = {"error": str(e), "http_code": getattr(e, "code", None), "timestamp": __import__("datetime").datetime.now().isoformat()}
    with open(OUT, "w") as f:
        json.dump(result, f, indent=2)
    print(f"ERROR: {e}", file=sys.stderr)

print(f"\nResult saved to {OUT}")