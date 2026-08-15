import urllib.request
import json
import time
import sys

def check_endpoint(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            data = json.loads(response.read().decode())
            print(f"SUCCESS: {url} returned {status}")
            print(f"Sample data: {str(data)[:200]}")
            return True
    except Exception as e:
        print(f"ERROR: {url} failed with {e}")
        return False

def main():
    print("Waiting for server to boot...")
    time.sleep(2)
    
    endpoints = [
        "http://127.0.0.1:8000/api/v1/health",
        "http://127.0.0.1:8000/api/v1/groups",
        "http://127.0.0.1:8000/api/v1/routine/1", # Try group 1
    ]
    
    success = True
    for url in endpoints:
        if not check_endpoint(url):
            success = False
            
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
