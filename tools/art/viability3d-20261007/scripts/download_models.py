import concurrent.futures
import hashlib
import json
import time
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
items = json.loads((root/'reports/model-download-plan.json').read_text())
start = time.monotonic()

def download(item):
    target = root/'models'/item['directory']/item['name']
    target.parent.mkdir(parents=True, exist_ok=True)
    expected = int(item['size'])
    sha = item['sha256']
    if target.exists() and target.stat().st_size == expected:
        with target.open('rb') as stream:
            actual_sha = hashlib.file_digest(stream, 'sha256').hexdigest()
        if actual_sha != sha:
            raise ValueError(f'Checksum mismatch in existing checkpoint: {target}')
        return {'name': item['name'], 'status': 'cached_verified', 'bytes': expected, 'sha256': actual_sha}
    partial = target.with_name(target.name+'.partial')
    if partial.exists() and partial.stat().st_size == expected:
        candidate_sha = hashlib.file_digest(partial.open('rb'), 'sha256').hexdigest()
        if candidate_sha == sha:
            partial.rename(target)
            result = {'name': item['name'], 'status': 'verified_existing_partial', 'bytes': expected, 'sha256': candidate_sha}
            print(json.dumps(result), flush=True)
            return result
    digest = hashlib.sha256()
    received = 0
    last_report = 0
    with urllib.request.urlopen(item['url'], timeout=90) as response, partial.open('wb') as output:
        while True:
            chunk = response.read(4*1024*1024)
            if not chunk:
                break
            output.write(chunk)
            digest.update(chunk)
            received += len(chunk)
            now = time.monotonic()
            if now-last_report>15:
                print(json.dumps({'name':item['name'],'percent':round(100*received/expected,1),'MB':round(received/1e6),'elapsed_s':round(now-start)}), flush=True)
                last_report = now
    actual_sha = digest.hexdigest()
    if received != expected or actual_sha != sha:
        raise RuntimeError(f"Integrity failure {item['name']}: {received}/{expected}, sha {actual_sha}/{sha}")
    partial.rename(target)
    result = {'name':item['name'],'status':'downloaded','bytes':received,'sha256':actual_sha,'elapsed_s':round(time.monotonic()-start,2)}
    print(json.dumps(result), flush=True)
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(download, sorted(items,key=lambda x:int(x['size']))))
(root/'reports/download-results.json').write_text(json.dumps(results,indent=2)+'\n')
print('All requested checkpoints verified.', flush=True)
