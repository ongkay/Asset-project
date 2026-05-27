"use client";

import { useState, type KeyboardEvent } from "react";

import Image from "next/image";

import { Monitor, Play, Smartphone } from "lucide-react";

import { MEMBER_PAGE_CONTENT, type MemberTutorialTab } from "./member-page-content";
import { MemberVideoDialog } from "./member-video-dialog";

const tutorialIcons = {
  android: Smartphone,
  pc: Monitor,
} as const;

function renderTutorialStep(step: MemberTutorialTab["steps"][number]) {
  return (
    <>
      {step.label}
      {"code" in step && step.code ? (
        <code className="rounded border border-white/10 bg-[#10151d] px-1.5 py-0.5 font-mono text-[12px] text-[#a855f7]">
          {step.code}
        </code>
      ) : null}
      {"linkHref" in step && step.linkHref && "linkLabel" in step && step.linkLabel ? (
        <a
          className="font-medium text-cyan-400 hover:text-sky-300 hover:underline"
          href={step.linkHref}
          rel="noreferrer"
          target="_blank"
        >
          {step.linkLabel}
        </a>
      ) : null}
      {"suffix" in step ? (step.suffix ?? null) : null}
    </>
  );
}

export function MemberInstallationTabs({
  initialTab = MEMBER_PAGE_CONTENT.tutorial.tabs[0].value,
}: {
  initialTab?: MemberTutorialTab["value"];
}) {
  const [activeTab, setActiveTab] = useState<MemberTutorialTab["value"]>(initialTab);
  const [activeVideo, setActiveVideo] = useState<MemberTutorialTab | null>(null);
  const activeTutorial = MEMBER_PAGE_CONTENT.tutorial.tabs.find((tutorialTab) => tutorialTab.value === activeTab);

  function activateTab(nextTab: MemberTutorialTab["value"]) {
    setActiveTab(nextTab);
  }

  function handleTabKeyDown(currentIndex: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateTab(MEMBER_PAGE_CONTENT.tutorial.tabs[currentIndex]?.value ?? activeTab);
      return;
    }

    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + MEMBER_PAGE_CONTENT.tutorial.tabs.length) % MEMBER_PAGE_CONTENT.tutorial.tabs.length;
    const nextTab = MEMBER_PAGE_CONTENT.tutorial.tabs[nextIndex];

    if (!nextTab) {
      return;
    }

    activateTab(nextTab.value);

    const nextButton = document.getElementById(`tutorial-tab-${nextTab.value}`);
    nextButton?.focus();
  }

  return (
    <>
      <section
        aria-label="Tutorial Instalasi"
        className="overflow-hidden rounded-2xl border border-white/8 bg-[rgba(23,27,36,0.6)] shadow-[0_30px_80px_rgba(0,0,0,0.32)] backdrop-blur-md"
      >
        <div className="border-b border-white/8 px-6 pt-7 sm:px-8">
          <h2 className="mb-6 font-semibold text-[18px] text-white">{MEMBER_PAGE_CONTENT.tutorial.title}</h2>
          <div aria-label="Tutorial Device Tabs" className="flex gap-7" role="tablist">
            {MEMBER_PAGE_CONTENT.tutorial.tabs.map((tutorialTab, index) => {
              const Icon = tutorialIcons[tutorialTab.value];
              const isActive = tutorialTab.value === activeTab;

              return (
                <button
                  aria-controls={`tutorial-panel-${tutorialTab.value}`}
                  aria-selected={isActive}
                  className={[
                    "flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold transition",
                    isActive ? "border-cyan-400 text-cyan-400" : "border-transparent text-[#a7afbd] hover:text-white",
                  ].join(" ")}
                  id={`tutorial-tab-${tutorialTab.value}`}
                  key={tutorialTab.value}
                  onClick={() => activateTab(tutorialTab.value)}
                  onKeyDown={(event) => handleTabKeyDown(index, event)}
                  role="tab"
                  type="button"
                >
                  <Icon className="size-4" />
                  {tutorialTab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTutorial ? (
          <div className="px-6 py-8 sm:px-8" id={`tutorial-panel-${activeTutorial.value}`} role="tabpanel">
            <ol className="flex list-none flex-col gap-4">
              {activeTutorial.steps.map((step, index) => (
                <li
                  className="relative pl-10 text-[14px] leading-7 text-[#a7afbd]"
                  key={`${activeTutorial.value}-${index + 1}`}
                >
                  <span className="absolute top-0 left-0 flex size-6 items-center justify-center rounded-full bg-cyan-400/12 font-bold text-[11px] text-cyan-400">
                    {index + 1}
                  </span>
                  {renderTutorialStep(step)}
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl border border-white/8 bg-gradient-to-br from-[rgba(23,27,36,0.85)] to-[rgba(16,21,29,0.85)] p-3 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.2),0_4px_6px_-2px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-[0_20px_25px_-5px_rgba(0,194,255,0.15),0_10px_10px_-5px_rgba(0,194,255,0.1)]">
              <button
                aria-label={activeTutorial.videoAriaLabel}
                className="group relative block w-full overflow-hidden rounded-lg"
                data-video-id={activeTutorial.videoId}
                onClick={() => setActiveVideo(activeTutorial)}
                type="button"
              >
                <Image
                  alt={activeTutorial.thumbnailAlt}
                  className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  height={720}
                  priority={activeTutorial.value === "pc"}
                  src={activeTutorial.thumbnailSrc}
                  width={1280}
                />
                <span className="absolute inset-0 bg-black/15" />
                <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm transition duration-300 group-hover:scale-110 group-hover:border-transparent group-hover:bg-cyan-400 group-hover:text-[#080c12]">
                  <Play className="ml-0.5 size-8 fill-current" />
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <MemberVideoDialog
        onOpenChange={(open) => {
          if (!open) {
            setActiveVideo(null);
          }
        }}
        title={activeVideo?.thumbnailAlt ?? "Video Tutorial"}
        videoId={activeVideo?.videoId ?? null}
      />
    </>
  );
}
