import { ArrowUpRight, MessageCircle, Send } from "lucide-react";

import { MEMBER_PAGE_CONTENT } from "./member-page-content";

const supportIcons = [MessageCircle, Send] as const;

export function MemberSupportCard() {
  return (
    <section
      aria-label="Help & Support"
      className="rounded-2xl border border-white/8 bg-[rgba(23,27,36,0.6)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.32)] backdrop-blur-md"
    >
      <h2 className="mb-5 font-semibold text-base text-white">{MEMBER_PAGE_CONTENT.support.title}</h2>
      <div className="flex flex-col gap-2">
        {MEMBER_PAGE_CONTENT.support.items.map((item, index) => {
          const Icon = supportIcons[index] ?? MessageCircle;

          return (
            <a
              className="group flex items-center gap-4 rounded-lg border border-transparent px-3 py-3 transition hover:border-white/10 hover:bg-white/[0.03]"
              href={item.href}
              key={item.label}
              rel="noreferrer"
              target="_blank"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/12 text-cyan-400">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-sm text-white">{item.label}</span>
                <span className="block text-[#a7afbd] text-xs leading-5">{item.description}</span>
              </span>
              <ArrowUpRight className="size-4 text-[#7b8190] transition group-hover:text-white" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
