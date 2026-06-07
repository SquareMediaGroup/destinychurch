"use client";

import { useState } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

interface Topic {
  question: string;
  description: string;
}

const topics: Topic[] = [
  {
    question: "Is there more to life than this?",
    description: "Exploring what gives life real meaning and purpose, and whether there's something beyond what we can see.",
  },
  {
    question: "Who is Jesus?",
    description: "Understanding the historical figure of Jesus and why his life and claims matter to billions of people today.",
  },
  {
    question: "Why did Jesus die?",
    description: "Discovering the meaning behind Jesus's crucifixion and what it signifies for faith and redemption.",
  },
  {
    question: "How can I have faith?",
    description: "Exploring what faith really means and practical steps to developing a genuine relationship with God.",
  },
  {
    question: "Why and how do I pray?",
    description: "Understanding prayer as a conversation with God, and discovering different ways to pray that work for you.",
  },
  {
    question: "Why and how should I read the Bible?",
    description: "Learning how to approach the Bible, why it matters, and discovering what it can mean in your life.",
  },
  {
    question: "How does God guide us?",
    description: "Exploring how God speaks to us today and learning to recognise and follow his guidance in our lives.",
  },
  {
    question: "Who is the Holy Spirit?",
    description: "Understanding the Holy Spirit and how the third person of the Trinity works in our everyday lives.",
  },
  {
    question: "What does the Holy Spirit do?",
    description: "Discovering the practical ways the Holy Spirit empowers, guides, and transforms our lives.",
  },
  {
    question: "How can I make the most of the rest of my life?",
    description: "Exploring how faith shapes our priorities and how to live a life of purpose and impact.",
  },
  {
    question: "How can I resist evil?",
    description: "Learning practical ways to stand against temptation and live with integrity in a complex world.",
  },
  {
    question: "Why and how should I tell others?",
    description: "Understanding why sharing your faith matters and discovering natural, genuine ways to talk about it.",
  },
];

export default function AlphaTopics() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-start gap-12 md:flex-row md:gap-20">
          <AnimateIn className="w-full md:w-1/2">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              What's covered
            </p>
            <h2 className="mb-8 text-3xl font-black text-destiny-grey md:text-4xl">
              The Topics
            </h2>
            <p className="mb-6 text-sm text-destiny-grey/60">
              Click on any topic to learn what you'll explore in that session. No pressure — just open conversations about the questions that matter most.
            </p>
            <div className="space-y-2">
              {topics.map((topic, i) => (
                <button
                  key={topic.question}
                  onClick={() =>
                    setExpanded(
                      expanded === topic.question ? null : topic.question
                    )
                  }
                  className="w-full text-left transition"
                >
                  <div className="flex items-start gap-3 rounded-2xl bg-[#f5f7fa] p-4 hover:bg-destiny-orange/5 transition-colors">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10 text-xs font-black text-destiny-orange flex-none mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-destiny-grey text-sm">
                        {topic.question}
                      </p>
                      {expanded === topic.question && (
                        <p className="mt-3 text-xs text-destiny-grey/70 leading-relaxed">
                          {topic.description}
                        </p>
                      )}
                    </div>
                    <span className="material-symbols-rounded text-lg text-destiny-grey/40 shrink-0 flex-none transition-transform duration-300"
                      style={{
                        transform:
                          expanded === topic.question
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                      }}
                    >
                      expand_more
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </AnimateIn>
          <AnimateIn delay={100} className="w-full md:w-1/2">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative h-48 overflow-hidden rounded-2xl">
                <Image src="/img/Alpha/Alpha/WiA-SC_V2-Carousel_02.webp" alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              </div>
              <div className="relative h-48 overflow-hidden rounded-2xl">
                <Image src="/img/Alpha/Alpha/WiA-SC_V2-Carousel_03.webp" alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              </div>
              <div className="relative col-span-2 h-40 overflow-hidden rounded-2xl">
                <Image src="/img/Alpha/Alpha/WiA-SC_V2-Carousel_04.webp" alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
