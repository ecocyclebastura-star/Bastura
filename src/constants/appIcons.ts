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
import galleryIcon from "../assets/icon-gallery.svg?raw";
import trashIcon from "../assets/icon-trash.svg?raw";
import infoIcon from "../assets/icon-info.svg?raw";
import phoneIcon from "../assets/icon-phone.svg?raw";
import mailIcon from "../assets/icon-mail.svg?raw";
import personSearchIcon from "../assets/icon-person-search.svg?raw";
import truckIcon from "../assets/icon-truck.svg?raw";
import calendarIcon from "../assets/icon-calendar.svg?raw";
import clockIcon from "../assets/icon-clock.svg?raw";
import documentIcon from "../assets/icon-document.svg?raw";
import handCoinIcon from "../assets/icon-hand-coin.svg?raw";
import bankIcon from "../assets/icon-bank.svg?raw";
import trashRoundedIcon from "../assets/icon-trash-rounded.svg?raw";
// Kotak berwarna di daftar transaksi dibuat lewat TransactionKindIcon.vue.
import setoranIcon from "../assets/icon-setoran.svg?raw";
import penarikanIcon from "../assets/icon-penarikan.svg?raw";

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
  gallery: galleryIcon,
  trash: trashIcon,
  info: infoIcon,
  phone: phoneIcon,
  mail: mailIcon,
  personSearch: personSearchIcon,
  truck: truckIcon,
  calendar: calendarIcon,
  clock: clockIcon,
  document: documentIcon,
  handCoin: handCoinIcon,
  bank: bankIcon,
  trashRounded: trashRoundedIcon,
  setoran: setoranIcon,
  penarikan: penarikanIcon,
} as const;

export type IconName = keyof typeof APP_ICONS;
