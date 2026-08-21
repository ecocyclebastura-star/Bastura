/**
 * Kumpulan ikon SVG dari folder assets.
 *
 * Isinya string mentah (`?raw`) supaya bisa di-inline ke DOM, bukan dipasang
 * lewat <img>. Bedanya: yang di-inline ikut `currentColor`, jadi warnanya
 * bisa diganti cuma dengan kelas `text-*`. Semua file ikonnya sudah diubah
 * pakai fill="currentColor".
 */
import homeIcon from "../assets/icon-home.svg?raw";
import walletIcon from "../assets/icon-wallet.svg?raw";
import historyIcon from "../assets/icon-history.svg?raw";
import accountIcon from "../assets/icon-account.svg?raw";
import listIcon from "../assets/icon-list.svg?raw";
import tipsIcon from "../assets/icon-tips.svg?raw";
import megaphoneIcon from "../assets/icon-megaphone.svg?raw";
import editProfileIcon from "../assets/icon-edit-profile.svg?raw";
import lockIcon from "../assets/icon-lock.svg?raw";
import helpIcon from "../assets/icon-help.svg?raw";
import deleteAccountIcon from "../assets/icon-delete-account.svg?raw";

export const APP_ICONS = {
  home: homeIcon,
  wallet: walletIcon,
  history: historyIcon,
  account: accountIcon,
  list: listIcon,
  tips: tipsIcon,
  megaphone: megaphoneIcon,
  editProfile: editProfileIcon,
  lock: lockIcon,
  help: helpIcon,
  deleteAccount: deleteAccountIcon,
} as const;

export type IconName = keyof typeof APP_ICONS;
