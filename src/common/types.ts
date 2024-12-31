import { ClsStore } from 'nestjs-cls';
import { StatelessUser } from 'src/auth/user.schema';

export interface CommonClsStore extends ClsStore {
  user?: StatelessUser;
  useragent?: string;
  ipv4?: string;
  ipv6?: string;
}
