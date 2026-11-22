"""Generate missing English clips with the same settings as Explorar."""

import argparse
import json
import re
import subprocess
import tempfile
import wave
from pathlib import Path

from imageio_ffmpeg import get_ffmpeg_exe
from piper import PiperVoice, SynthesisConfig


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'src/content/anatomy/pronunciacion'


def body_terms():
    result = subprocess.run(
        ['node', '--experimental-strip-types', '--input-type=module', '-e', """
import { anatomyParts } from './src/features/cuerpo/anatomy.ts';
import { regionalBoneTerms } from './src/features/cuerpo/regionalBoneTerms.ts';
console.log(JSON.stringify([...anatomyParts, ...regionalBoneTerms].map(part => part.en)));
"""], cwd=ROOT, check=True, capture_output=True, text=True,
    )
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model', type=Path, help='Path to en_US-ljspeech-medium.onnx')
    parser.add_argument('terms', nargs='*', help='English terms, or all Cuerpo terms by default')
    args = parser.parse_args()

    pending = {}
    for term in sorted(set(args.terms or body_terms())):
        name = re.sub(r'[^a-z0-9]+', '-', term.lower()).strip('-')
        if not name:
            parser.error('Cada término debe contener letras o números.')
        clip = OUTPUT / (name + '.mp3')
        if not clip.exists():
            pending.setdefault(clip, term)

    if not pending:
        print('0 pronunciaciones nuevas.')
        return

    voice = PiperVoice.load(args.model)
    config = SynthesisConfig(length_scale=1.12)
    ffmpeg = get_ffmpeg_exe()
    generated = 0
    with tempfile.TemporaryDirectory() as directory:
        wav = Path(directory) / 'term.wav'
        mp3 = Path(directory) / 'term.mp3'
        for clip, term in pending.items():
            with wave.open(str(wav), 'wb') as stream:
                voice.synthesize_wav(term + '.', stream, syn_config=config)
            subprocess.run([
                ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                '-codec:a', 'libmp3lame', '-b:a', '48k', str(mp3),
            ], check=True)
            try:
                with clip.open('xb') as destination:
                    destination.write(mp3.read_bytes())
            except FileExistsError:
                continue
            generated += 1
    print(f'{generated} pronunciaciones nuevas.')


if __name__ == '__main__':
    main()
