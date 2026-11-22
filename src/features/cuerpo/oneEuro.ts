// Low speed favours stability. Changes with a high derivative raise the cutoff.
function gain(cutoff: number, dt: number) {
  const angular = 2*Math.PI*cutoff*dt;
  return angular/(angular+1);
}

export class OneEuro {
  private speed = 0;
  private raw: number;
  constructor(private value: number, private time: number) { this.raw = value; }

  filter(input: number, time: number) {
    const dt = Math.max(.001, (time-this.time)/1000);
    this.speed += gain(1, dt)*((input-this.raw)/dt-this.speed);
    this.value += gain(1.25 + 11*Math.abs(this.speed), dt)*(input-this.value);
    this.raw = input;
    this.time = time;
    return this.value;
  }
}
