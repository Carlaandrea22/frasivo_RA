"""Generate catalog pronunciation clips. See the adjacent asset credits for setup."""
import argparse
import re
import subprocess
import tempfile
import wave
from pathlib import Path

from imageio_ffmpeg import get_ffmpeg_exe
from piper import PiperVoice, SynthesisConfig

parser = argparse.ArgumentParser()
parser.add_argument('model', type=Path, help='Path to en_US-ljspeech-medium.onnx')
parser.add_argument('--missing-only', action='store_true', help='Keep existing catalog clips')
args = parser.parse_args()
catalog = Path(__file__).resolve().parent.parent / 'src/content/anatomy'
output = catalog / 'pronunciacion'
output.mkdir(exist_ok=True)

terms = set()
for filename in (
    'catalogo.ts', 'partesAtlas.ts', 'corazon.ts', 'ampliacionAtlas.ts',
    'atlasAxialDigestivo.ts', 'atlasHuesosNuevos.ts', 'atlasMusculosNuevos.ts',
):
    content = (catalog / filename).read_text(encoding='utf-8')
    terms.update(re.findall(r"terminoEn: '([^']+)'", content))
    if filename == 'catalogo.ts':
        terms.update(re.findall(r"^  \['[^']+', '[^']+', '([^']+)', '[^']+',", content, re.M))

voice = PiperVoice.load(args.model)
config = SynthesisConfig(length_scale=1.12)
generated = 0
with tempfile.TemporaryDirectory() as directory:
    wav = Path(directory) / 'term.wav'
    for term in sorted(terms):
        name = re.sub(r'[^a-z0-9]+', '-', term.lower()).strip('-')
        clip = output / (name + '.mp3')
        if args.missing_only and clip.exists():
            continue
        with wave.open(str(wav), 'wb') as stream:
            voice.synthesize_wav(term + '.', stream, syn_config=config)
        subprocess.run([
            get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
            '-codec:a', 'libmp3lame', '-b:a', '48k', str(clip),
        ], check=True)
        generated += 1
print(f'{generated} pronunciaciones generadas.')
