import type { ConsolePaymentError } from "@/modules/console/types";

export const MEMBER_PAGE_CONTENT = {
  brandLabel: "TvLink",
  paymentError: {
    messages: {
      "disabled-package": "Package sudah tidak tersedia untuk pembelian baru.",
      "invalid-package": "Package yang dipilih tidak valid atau sudah tidak tersedia.",
      "missing-package": "Package tujuan pembayaran tidak ditemukan.",
    } satisfies Record<ConsolePaymentError, string>,
    title: "Checkout belum bisa dilanjutkan",
  },
  redeemDialog: {
    cancelLabel: "Batal",
    description: "Masukkan kode voucher atau CD key Anda untuk mengaktifkan langganan TvLink.",
    errorTitle: "Redeem belum berhasil",
    fieldLabel: "Kode Voucher",
    placeholder: "Contoh: TVL-XXXX-XXXX",
    submitLabel: "Redeem Sekarang",
    successToast: "Voucher berhasil di-redeem!",
    title: "Redeem Voucher",
  },
  subscription: {
    expiryDateLabel: "Expiry Date",
    noneValue: "-",
    renewLabel: "Renew Subscription",
    renewUrl: "/checkout",
    redeemLabel: "Redeem Code",
    startDateLabel: "Start Date",
    statusLabels: {
      active: "active",
      canceled: "canceled",
      expired: "expired",
      none: "none",
      processed: "processed",
    },
    title: "Subscription",
    activePlanLabel: "Active Plan",
  },
  support: {
    items: [
      {
        description: "Butuh bantuan? Chat admin kami via WhatsApp.",
        href: "https://wa.link/w3xnqc",
        label: "Hubungi Admin",
      },
      {
        description: "Gabung grup diskusi bersama member lainnya.",
        href: "https://t.me/pk_oa",
        label: "Grup Komunitas",
      },
    ],
    title: "Help & Support",
  },
  tutorial: {
    title: "Cara Install Extension TvLink",
    tabs: [
      {
        downloadUrl: "https://tvlink.netlify.app/tvlink.zip",
        label: "PC / Laptop",
        thumbnailAlt: "Video tutorial install TvLink di PC",
        thumbnailSrc: "/member/thumbnail-pc.jpg",
        value: "pc",
        videoAriaLabel: "Play video tutorial install TvLink di PC",
        videoId: "rjQpnHK5zTw",
        steps: [
          {
            label: "Download extension TvLink: ",
            linkHref: "https://tvlink.netlify.app/tvlink.zip",
            linkLabel: "Klik Disini",
          },
          { label: "Buka folder download, pindahkan file tvlink ke folder baru, lalu extract file." },
          { label: "Buka Chrome dan buat profil Chrome baru" },
          { code: "chrome://extensions/", label: "Ketik ", suffix: " di address bar & Enter." },
          { label: 'Aktifkan "Mode Developer" di pojok kanan atas.' },
          { label: 'Klik "Load unpacked" di pojok kiri atas' },
          { label: "Pilih folder hasil extrak file ZIP TvLink tadi" },
          { label: "Buka extension tvlink dan jika belum login silahkan login." },
        ],
      },
      {
        downloadUrl: "https://tvlink.netlify.app/tvlink.zip",
        label: "Android (Kiwi)",
        thumbnailAlt: "Video tutorial install TvLink di Android",
        thumbnailSrc: "/member/thumbnail-hp.jpg",
        value: "android",
        videoAriaLabel: "Play video tutorial install TvLink di Android",
        videoId: "hm2RDtn427U",
        steps: [
          {
            label: "Download extension TvLink: ",
            linkHref: "https://tvlink.netlify.app/tvlink.zip",
            linkLabel: "Klik Disini",
          },
          {
            label: "Download Install Kiwi Browser dari Play Store: ",
            linkHref: "https://play.google.com/store/apps/details?id=com.kiwibrowser.browser",
            linkLabel: "Klik Disini",
          },
          { label: "Buka Kiwi Browser." },
          { label: "Klik ikon titik tiga (menu) di pojok kanan atas." },
          { label: 'Pilih menu "Ekstensi" (Extensions) lalu Aktifkan "Mode Developer".' },
          { code: "+(from .zip/.crx/.user.js)", label: "Klik ", suffix: " dan Pilih file tvlink.zip." },
          { label: 'Setelah terinstal, klik menu (titik tiga lagi), dan klik "TvLink".' },
          { label: "Jika belum login silahkan login" },
        ],
      },
    ],
  },
  userMenu: {
    accountLabel: "Account",
    extendLabel: "Extend Subscriber",
    extendUrl: "/checkout",
    logoutLabel: "Logout",
    redeemLabel: "Redeem Code",
    roleLabel: "Member Area",
  },
  welcome: {
    description: "Kelola langganan dan akses ekstensi TvLink Anda melalui dashboard ini.",
    titlePrefix: "Welcome back, ",
    titleSuffix: "! 👋",
  },
} as const;

export type MemberTutorialTab = (typeof MEMBER_PAGE_CONTENT.tutorial.tabs)[number];
