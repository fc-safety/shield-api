import { ClsStore } from 'nestjs-cls';
import { StatelessUser } from 'src/auth/user.schema';
import { ViewContext } from './utils';

export interface CommonClsStore extends ClsStore {
  user?: StatelessUser;
  viewContext?: ViewContext;
  useragent?: string;
  ipv4?: string;
  ipv6?: string;
  mode?: 'cron' | 'request';
}
