import json
from pathlib import Path

base = Path('slither-run-20251009-212045.json')
new = Path('slither-run-20251009-212445.json')

def load(path):
    return json.loads(path.read_text())

b = load(base)
n = load(new)

def key(det):
    # use check + description snippet to identify
    return det.get('check','') + '|' + (det.get('description','')[:200])

b_set = { key(d): d for d in b['results']['detectors'] }

n_set = { key(d): d for d in n['results']['detectors'] }

added = [k for k in n_set.keys() if k not in b_set]
removed = [k for k in b_set.keys() if k not in n_set]

print('Total detectors before:', len(b_set))
print('Total detectors after :', len(n_set))
print('Added detectors:', len(added))
print('Removed detectors:', len(removed))
print('\nTop added (sample 20):')
for k in added[:20]:
    d = n_set[k]
    print('-', d['check'], '|', d.get('impact'), '|', d.get('confidence'))

print('\nTop removed (sample 20):')
for k in removed[:20]:
    d = b_set[k]
    print('-', d['check'], '|', d.get('impact'), '|', d.get('confidence'))

# Find specific functions
search_targets = [
    'BashoodPresaleFinal.purchaseWithETH',
    'BashoodMultiToken.mintAllNFTs'
]

print('\nDetails for target functions:')
for det_map,name in [(b_set,'before'),(n_set,'after')]:
    print('\n==',name,'==')
    for k,d in det_map.items():
        desc = d.get('description','')
        for t in search_targets:
            if t in desc:
                print('\n- Detector check:', d.get('check'))
                print('  Impact:', d.get('impact'),'Confidence:',d.get('confidence'))
                print('  Description snippet:', desc.split('\n')[0][:300])

# Also list High/Medium detectors that reference BashoodPresaleFinal or BashoodMultiToken
print('\nHigh/Medium detectors involving Presale or MultiToken:')
for det_map,name in [(b_set,'before'),(n_set,'after')]:
    print('\n--',name,'--')
    for k,d in det_map.items():
        if d.get('impact') in ('High','Medium') and ('BashoodPresaleFinal' in d.get('description','') or 'BashoodMultiToken' in d.get('description','')):
            print('-', d.get('check'), '|', d.get('impact'), '|', d.get('confidence'))

# exit
