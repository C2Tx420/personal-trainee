import { t } from '@/i18n';

export const MUSCLE_LABEL: Record<string, string> = {
  chest: t('Ngực'), front_delt: t('Vai trước'), side_delt: t('Vai giữa'), rear_delt: t('Vai sau'), lats: t('Xô'), upper_back: t('Lưng trên'),
  traps: t('Cầu vai'), biceps: t('Tay trước'), triceps: t('Tay sau'), forearms: t('Cẳng tay'), quads: t('Đùi trước'), hamstrings: t('Đùi sau'),
  glutes: t('Mông'), calves: t('Bắp chân'), abs: t('Bụng'), obliques: t('Bụng xiên'), lower_back: t('Lưng dưới'), adductors: t('Đùi trong'), cardio: t('Tim mạch'),
};

export const EQUIPMENT_LABEL: Record<string, string> = {
  machine: t('Máy'), cable: t('Cáp'), dumbbell: t('Tạ đơn'), barbell: t('Tạ đòn'), bodyweight: t('Thân người'), smith: 'Smith',
  cardio_machine: t('Máy cardio'), none: t('Không dụng cụ'),
};
