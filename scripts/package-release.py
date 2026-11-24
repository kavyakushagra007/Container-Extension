#!/usr/bin/env python3
"""Build an upload-only Chrome Web Store draft; never includes tests or credentials."""
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
files = [ROOT / 'manifest.json', ROOT / 'privacy-policy.html']
for directory, extensions in [('src', {'.js', '.html', '.css'}), ('icons', {'.png'})]:
    files.extend(path for path in (ROOT / directory).rglob('*') if path.is_file() and path.suffix in extensions)
entries = {path.relative_to(ROOT).as_posix() for path in files}
references = [manifest['background']['service_worker'], manifest['action']['default_popup']]
references.extend(manifest['icons'].values())
for content in manifest.get('content_scripts', []):
    references.extend(content.get('js', []))
    references.extend(content.get('css', []))
for reference in references:
    assert reference in entries, f'Missing manifest asset: {reference}'
for file in files:
    if file.suffix == '.html':
        for reference in re.findall(r'<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"', file.read_text()):
            if re.match(r'^(?:https?:|//)', reference):
                raise ValueError(f'Remote executable or stylesheet: {reference}')
            resolved = (file.parent / reference).resolve().relative_to(ROOT).as_posix()
            assert resolved in entries, f'Missing HTML asset: {resolved}'
    if file.suffix in {'.html', '.js'}:
        assert not re.search(r'<[^>]+\son[a-z]+\s*=', file.read_text(), re.I), f'Inline event handler: {file}'
output = ROOT / 'release' / f"saveit-{manifest['version']}-draft.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(files):
        archive.write(file, file.relative_to(ROOT).as_posix())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert 'manifest.json' in archive.namelist()
    assert not any(name.startswith(('tests/', '.git/', 'release/')) for name in archive.namelist())
checksum = hashlib.sha256(output.read_bytes()).hexdigest()
(output.parent / (output.name + '.sha256')).write_text(checksum + '  ' + output.name + '\n')
print(f'Built {output}\n{len(files)} runtime files; {output.stat().st_size:,} bytes\nSHA-256 {checksum}')
