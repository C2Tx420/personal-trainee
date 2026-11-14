import type { Dict } from '../util';
import { AUTH } from './auth';
import { BODY } from './body';
import { COMMON } from './common';
import { ENGINE } from './engine';
import { EXERCISES } from './exercises';
import { MORE } from './more';
import { TODAY } from './today';
import { TRAINING } from './training';
import { WHATS_NEW } from './whats-new';
import { WORKOUT } from './workout';

/** Vietnamese source string → English. Split by area; later files win on a duplicate key. */
export const EN: Dict = { ...COMMON, ...ENGINE, ...AUTH, ...TODAY, ...WORKOUT, ...TRAINING, ...EXERCISES, ...BODY, ...MORE, ...WHATS_NEW };
