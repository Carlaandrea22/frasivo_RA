import huesos from '../../../assets/anatomy/body/bones.glb?url';
import musculos from '../../../assets/anatomy/body/muscles.glb?url';
import organos from '../../../assets/anatomy/body/organs.glb?url';
import corazon from '../../../assets/anatomy/cardiovascular/heart-cutaway.glb?url';

export const modelos: Readonly<Record<string, string>> = {
  'body-bones': huesos,
  'body-muscles': musculos,
  'body-organs': organos,
  'heart-cutaway': corazon,
};
