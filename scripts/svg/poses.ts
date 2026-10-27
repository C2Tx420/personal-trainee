import type { Drawing, FrontPose, Prop, SidePose } from './render';

/**
 * Start/end pose of each exercise (each panel ~150 wide, floor at y=190).
 * Side view: the figure faces right (larger x = forward).
 */

// ── shared frames
const seated = { head: [60, 50], s: [62, 70], p: [60, 124], k: [102, 126], f: [106, 186] } as const;
const seatProps: Prop[] = [
  { t: 'rect', x: 40, y: 58, w: 9, h: 72 },
  { t: 'rect', x: 40, y: 128, w: 64, h: 8 },
  { t: 'line', a: [60, 136], b: [60, 190] },
];
const stack: Prop = { t: 'stack', x: 128, y: 40, h: 140 };
const standing = { head: [70, 38], s: [70, 58], p: [70, 114], k: [72, 152], f: [70, 190] } as const;

const S = (o: Record<string, unknown>): SidePose => ({ view: 'side', ...o }) as unknown as SidePose;
const SS = (o: Partial<SidePose>): SidePose => S({ ...seated, e: [62, 96], w: [64, 120], ...o } as SidePose);
const ST = (o: Partial<SidePose>): SidePose => S({ ...standing, e: [70, 86], w: [72, 112], ...o } as SidePose);

const frontStand: Omit<FrontPose, 'le' | 're' | 'lw' | 'rw'> = {
  view: 'front', head: [75, 38], ls: [60, 60], rs: [90, 60], lh: [66, 114], rh: [84, 114],
  lk: [65, 152], rk: [85, 152], lf: [63, 190], rf: [87, 190],
};
const frontSeat: Omit<FrontPose, 'le' | 're' | 'lw' | 'rw'> = {
  view: 'front', head: [75, 44], ls: [60, 66], rs: [90, 66], lh: [66, 120], rh: [84, 120],
  lk: [60, 146], rk: [90, 146], lf: [58, 188], rf: [92, 188],
};
const F = (base: typeof frontStand, arms: Pick<FrontPose, 'le' | 're' | 'lw' | 'rw'>): FrontPose => ({ ...base, ...arms });

const lateralA = { le: [55, 86], lw: [52, 110], re: [95, 86], rw: [98, 110] } as Pick<FrontPose, 'le' | 're' | 'lw' | 'rw'>;
const lateralB = { le: [36, 62], lw: [14, 64], re: [114, 62], rw: [136, 64] } as Pick<FrontPose, 'le' | 're' | 'lw' | 'rw'>;
const flyOpen = { le: [36, 66], lw: [24, 48], re: [114, 66], rw: [126, 48] } as Pick<FrontPose, 'le' | 're' | 'lw' | 'rw'>;
const flyClosed = { le: [58, 74], lw: [70, 52], re: [92, 74], rw: [80, 52] } as Pick<FrontPose, 'le' | 're' | 'lw' | 'rw'>;

const squatBottom = { head: [62, 84], s: [64, 102], p: [48, 146], k: [94, 148], f: [80, 190] };
const benchProps: Prop[] = [
  { t: 'rect', x: 22, y: 120, w: 92, h: 8 },
  { t: 'line', a: [34, 128], b: [34, 190] },
  { t: 'line', a: [104, 128], b: [104, 190] },
];

export const DRAWINGS: Record<string, Drawing> = {
  // ───────────── Push
  machine_chest_press: {
    props: [...seatProps, stack],
    a: SS({ e: [48, 92], w: [86, 84] }),
    b: SS({ e: [94, 78], w: [124, 78] }),
    hold: 'handle',
  },
  bench_press: {
    props: benchProps,
    a: S({ head: [30, 110], s: [44, 114], p: [98, 116], k: [124, 100], f: [134, 190], e: [40, 136], w: [50, 100] }),
    b: S({ head: [30, 110], s: [44, 114], p: [98, 116], k: [124, 100], f: [134, 190], e: [47, 84], w: [50, 58] }),
    hold: 'bar',
  },
  incline_db_press: {
    props: [{ t: 'line', a: [92, 134], b: [50, 66], w: 9 }, { t: 'line', a: [80, 134], b: [80, 190] }],
    a: S({ head: [52, 60], s: [60, 80], p: [88, 128], k: [120, 132], f: [122, 190], e: [48, 104], w: [66, 84] }),
    b: S({ head: [52, 60], s: [60, 80], p: [88, 128], k: [120, 132], f: [122, 190], e: [68, 56], w: [76, 32] }),
    hold: 'db',
  },
  dips: {
    props: [{ t: 'line', a: [50, 110], b: [100, 110], w: 6 }, { t: 'line', a: [96, 110], b: [96, 190] }],
    a: S({ head: [76, 66], s: [72, 84], p: [66, 132], k: [80, 156], f: [64, 176], e: [50, 100], w: [72, 110] }),
    b: S({ head: [74, 42], s: [72, 60], p: [68, 112], k: [82, 136], f: [66, 156], e: [70, 86], w: [72, 110] }),
  },
  pec_deck_fly: {
    props: [{ t: 'rect', x: 58, y: 52, w: 34, h: 72 }, { t: 'rect', x: 52, y: 120, w: 46, h: 8 }],
    a: F(frontSeat, flyOpen),
    b: F(frontSeat, flyClosed),
    hold: 'pad',
  },
  machine_shoulder_press: {
    props: [...seatProps, stack],
    a: SS({ e: [72, 92], w: [74, 62] }),
    b: SS({ e: [68, 40], w: [70, 14] }),
    hold: 'handle',
  },
  seated_db_shoulder_press: {
    props: seatProps,
    a: SS({ e: [72, 92], w: [74, 62] }),
    b: SS({ e: [68, 40], w: [70, 14] }),
    hold: 'db',
  },
  db_lateral_raise: { a: F(frontStand, lateralA), b: F(frontStand, lateralB), hold: 'db' },
  cable_lateral_raise: {
    props: [{ t: 'rect', x: 128, y: 30, w: 14, h: 160 }, { t: 'cable', from: [134, 184], to: 'hands' }],
    a: F(frontStand, { le: [55, 86], lw: [52, 110], re: [95, 86], rw: [92, 112] }),
    b: F(frontStand, { le: [55, 86], lw: [52, 110], re: [114, 62], rw: [136, 64] }),
    hold: 'handle',
    motion: 'rw',
  },
  machine_triceps_extension: {
    props: [...seatProps, { t: 'rect', x: 80, y: 84, w: 26, h: 8 }, stack],
    a: SS({ e: [94, 80], w: [96, 50] }),
    b: SS({ e: [94, 80], w: [122, 96] }),
    hold: 'handle',
  },
  triceps_pushdown: {
    props: [{ t: 'rect', x: 120, y: 14, w: 14, h: 176 }, { t: 'cable', from: [118, 22], to: 'hands' }],
    a: ST({ e: [74, 94], w: [98, 84] }),
    b: ST({ e: [74, 94], w: [84, 122] }),
    hold: 'rope',
  },

  // ───────────── Pull
  lat_pulldown: {
    props: [...seatProps, { t: 'rect', x: 86, y: 112, w: 26, h: 8 }, { t: 'rect', x: 66, y: 4, w: 16, h: 8 }, { t: 'cable', from: [74, 8], to: 'hands' }],
    a: SS({ e: [74, 32], w: [78, 10], k: [102, 122] }),
    b: SS({ e: [54, 98], w: [72, 72], k: [102, 122] }),
    hold: 'handle',
  },
  pull_up: {
    props: [{ t: 'line', a: [36, 10], b: [110, 10], w: 6 }],
    a: S({ head: [72, 46], s: [72, 62], p: [72, 114], k: [76, 150], f: [72, 184], e: [72, 38], w: [72, 12] }),
    b: S({ head: [72, 22], s: [72, 38], p: [72, 90], k: [76, 126], f: [72, 160], e: [58, 52], w: [72, 12] }),
  },
  assisted_pull_up: {
    props: [{ t: 'line', a: [36, 10], b: [110, 10], w: 6 }, { t: 'rect', x: 56, y: 150, w: 40, h: 8 }, stack],
    a: S({ head: [72, 46], s: [72, 62], p: [72, 112], k: [76, 146], f: [52, 150], e: [72, 38], w: [72, 12] }),
    b: S({ head: [72, 24], s: [72, 40], p: [72, 90], k: [76, 124], f: [52, 128], e: [58, 54], w: [72, 12] }),
    propsA: [{ t: 'rect', x: 56, y: 150, w: 40, h: 8 }],
  },
  chest_supported_machine_row: {
    props: [{ t: 'line', a: [100, 66], b: [80, 112], w: 10 }, { t: 'rect', x: 34, y: 126, w: 40, h: 8 }, { t: 'line', a: [54, 134], b: [54, 190] }],
    a: S({ head: [98, 58], s: [86, 76], p: [52, 124], k: [92, 140], f: [96, 190], e: [104, 102], w: [116, 128] }),
    b: S({ head: [98, 58], s: [86, 76], p: [52, 124], k: [92, 140], f: [96, 190], e: [60, 96], w: [88, 104] }),
    hold: 'handle',
  },
  barbell_row: {
    a: S({ head: [116, 66], s: [100, 76], p: [58, 104], k: [70, 146], f: [64, 190], e: [102, 106], w: [104, 136] }),
    b: S({ head: [116, 66], s: [100, 76], p: [58, 104], k: [70, 146], f: [64, 190], e: [74, 94], w: [94, 112] }),
    hold: 'bar',
  },
  one_arm_db_row: {
    props: [{ t: 'rect', x: 74, y: 130, w: 70, h: 8 }, { t: 'line', a: [110, 138], b: [110, 190] }],
    a: S({ head: [124, 92], s: [106, 100], p: [52, 104], k: [54, 146], f: [46, 190], e: [108, 126], w: [108, 152] }),
    b: S({ head: [124, 92], s: [106, 100], p: [52, 104], k: [54, 146], f: [46, 190], e: [84, 88], w: [98, 112] }),
    hold: 'db',
  },
  seated_cable_row: {
    props: [{ t: 'rect', x: 18, y: 146, w: 60, h: 8 }, { t: 'rect', x: 132, y: 70, w: 14, h: 120 }, { t: 'cable', from: [134, 112], to: 'hands' }],
    a: S({ head: [56, 76], s: [52, 94], p: [40, 144], k: [86, 130], f: [124, 150], e: [86, 106], w: [116, 110] }),
    b: S({ head: [46, 74], s: [44, 92], p: [40, 144], k: [86, 130], f: [124, 150], e: [24, 106], w: [64, 112] }),
    hold: 'handle',
  },
  face_pull: {
    props: [{ t: 'rect', x: 134, y: 30, w: 12, h: 160 }, { t: 'cable', from: [136, 54], to: 'hands' }],
    a: ST({ e: [100, 64], w: [126, 60] }),
    b: ST({ e: [54, 56], w: [84, 44] }),
    hold: 'rope',
  },
  reverse_pec_deck: {
    props: [{ t: 'rect', x: 58, y: 52, w: 34, h: 72 }, { t: 'rect', x: 52, y: 120, w: 46, h: 8 }],
    a: F(frontSeat, flyClosed),
    b: F(frontSeat, flyOpen),
    hold: 'handle',
  },
  machine_biceps_curl: {
    props: [...seatProps, { t: 'rect', x: 76, y: 98, w: 36, h: 8 }],
    a: SS({ e: [98, 96], w: [128, 112] }),
    b: SS({ e: [98, 96], w: [86, 66] }),
    hold: 'handle',
  },
  cable_curl: {
    props: [{ t: 'rect', x: 120, y: 120, w: 14, h: 70 }, { t: 'cable', from: [122, 184], to: 'hands' }],
    a: ST({ e: [72, 92], w: [80, 120] }),
    b: ST({ e: [72, 92], w: [92, 64] }),
    hold: 'handle',
  },
  db_curl: {
    a: ST({ e: [72, 92], w: [76, 120] }),
    b: ST({ e: [72, 92], w: [90, 64] }),
    hold: 'db',
  },

  // ───────────── Legs
  leg_press: {
    props: [{ t: 'line', a: [74, 140], b: [20, 84], w: 10 }, { t: 'rect', x: 50, y: 138, w: 40, h: 8 }],
    a: S({ head: [22, 76], s: [34, 96], p: [64, 134], k: [94, 86], f: [104, 76], e: [52, 122], w: [70, 132] }),
    b: S({ head: [22, 76], s: [34, 96], p: [64, 134], k: [100, 98], f: [134, 62], e: [52, 122], w: [70, 132] }),
    propsA: [{ t: 'line', a: [92, 60], b: [118, 94], w: 7 }],
    propsB: [{ t: 'line', a: [122, 46], b: [148, 80], w: 7 }],
  },
  hack_squat: {
    props: [{ t: 'line', a: [40, 190], b: [118, 30], w: 3 }],
    a: S({ head: [64, 40], s: [68, 60], p: [78, 114], k: [80, 152], f: [80, 190], e: [62, 50], w: [68, 46] }),
    b: S({ head: [56, 78], s: [60, 96], p: [52, 144], k: [98, 146], f: [82, 190], e: [54, 86], w: [62, 82] }),
  },
  goblet_squat: {
    a: S({ ...standing, e: [80, 86], w: [84, 70] }),
    b: S({ ...squatBottom, e: [86, 118], w: [90, 102] }),
    hold: 'db',
  },
  back_squat: {
    a: S({ ...standing, e: [54, 74], w: [64, 60] }),
    b: S({ ...squatBottom, e: [50, 114], w: [60, 100] }),
    hold: 'bar',
    motion: 'p',
  },
  smith_squat: {
    props: [{ t: 'line', a: [30, 20], b: [30, 190], w: 3 }, { t: 'line', a: [110, 20], b: [110, 190], w: 3 }],
    a: S({ ...standing, e: [54, 74], w: [64, 60] }),
    b: S({ ...squatBottom, e: [50, 114], w: [60, 100] }),
    hold: 'bar',
    motion: 'p',
  },
  romanian_deadlift: {
    a: ST({ e: [70, 88], w: [72, 114] }),
    b: S({ head: [114, 82], s: [100, 88], p: [56, 106], k: [66, 148], f: [66, 190], e: [104, 116], w: [106, 142] }),
    hold: 'db',
    motion: 'head',
  },
  leg_curl: {
    props: [...seatProps, { t: 'rect', x: 92, y: 112, w: 26, h: 8 }],
    a: SS({ e: [76, 100], w: [92, 116], k: [104, 126], f: [144, 130] }),
    b: SS({ e: [76, 100], w: [92, 116], k: [104, 126], f: [96, 172] }),
    motion: 'f',
  },
  back_extension_45: {
    props: [{ t: 'rect', x: 62, y: 104, w: 22, h: 14, r: 4 }, { t: 'line', a: [118, 172], b: [140, 172], w: 6 }, { t: 'line', a: [70, 118], b: [96, 190] }],
    a: S({ head: [70, 172], s: [64, 152], p: [74, 112], k: [102, 142], f: [126, 168], e: [56, 160], w: [62, 170] }),
    b: S({ head: [28, 66], s: [42, 80], p: [74, 112], k: [102, 142], f: [126, 168], e: [40, 98], w: [56, 96] }),
    motion: 'head',
  },
  calf_raise: {
    props: [{ t: 'rect', x: 40, y: 50, w: 50, h: 8 }, { t: 'line', a: [96, 56], b: [96, 190] }, { t: 'rect', x: 56, y: 186, w: 40, h: 6 }],
    a: ST({ e: [62, 80], w: [60, 56] }),
    b: S({ head: [70, 26], s: [70, 46], p: [70, 102], k: [72, 140], f: [76, 178], e: [62, 68], w: [60, 44] }),
    motion: 'head',
  },
  plank: {
    a: S({ head: [124, 136], s: [110, 146], p: [62, 152], k: [40, 164], f: [14, 186], e: [110, 184], w: [130, 186] }),
    b: S({ head: [124, 136], s: [110, 146], p: [62, 152], k: [40, 164], f: [14, 186], e: [110, 184], w: [130, 186] }),
    motion: null,
  },

  // ───────────── Cardio / core
  treadmill_walk: {
    props: [{ t: 'rect', x: 12, y: 184, w: 124, h: 6 }, { t: 'line', a: [132, 184], b: [122, 80], w: 4 }, { t: 'line', a: [122, 80], b: [100, 84], w: 4 }],
    a: S({ head: [70, 38], s: [70, 58], p: [70, 114], k: [62, 150], f: [54, 184], e: [80, 84], w: [90, 102] }),
    b: S({ head: [72, 38], s: [72, 58], p: [72, 114], k: [84, 148], f: [94, 184], e: [62, 84], w: [56, 104] }),
    motion: 'f',
  },
  walk: {
    a: S({ head: [70, 38], s: [70, 58], p: [70, 114], k: [62, 150], f: [54, 190], e: [80, 84], w: [90, 102] }),
    b: S({ head: [72, 38], s: [72, 58], p: [72, 114], k: [84, 148], f: [94, 190], e: [62, 84], w: [56, 104] }),
    motion: 'f',
  },
  zone2_cardio: {
    props: [{ t: 'circle', c: [86, 160], r: 22 }, { t: 'line', a: [62, 104], b: [86, 160], w: 4 }, { t: 'line', a: [86, 160], b: [118, 96], w: 4 }, { t: 'line', a: [50, 102], b: [70, 102], w: 6 }],
    a: S({ head: [100, 44], s: [90, 62], p: [60, 100], k: [92, 122], f: [86, 140], e: [108, 80], w: [118, 96] }),
    b: S({ head: [100, 44], s: [90, 62], p: [60, 100], k: [84, 134], f: [92, 180], e: [108, 80], w: [118, 96] }),
    motion: 'f',
  },
  dead_bug: {
    a: S({ head: [24, 160], s: [40, 166], p: [90, 168], k: [94, 134], f: [122, 136], e: [42, 138], w: [44, 112] }),
    b: S({ head: [24, 160], s: [40, 166], p: [90, 168], k: [118, 160], f: [146, 164], e: [24, 148], w: [8, 136] }),
    motion: 'f',
  },
  side_plank: {
    a: S({ head: [118, 120], s: [106, 132], p: [62, 166], k: [38, 176], f: [14, 186], e: [104, 172], w: [118, 184] }),
    b: S({ head: [120, 112], s: [106, 126], p: [62, 146], k: [38, 166], f: [14, 186], e: [104, 172], w: [118, 184] }),
    motion: 'p',
  },
};
