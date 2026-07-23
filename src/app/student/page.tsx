import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Zap, Swords, Target, ExternalLink } from "lucide-react";
import Image from "next/image";

export default async function StudentDashboardPage() {
  const user = await requireRole([Role.STUDENT]);

  const practiceCards = [
    {
      title: "Tactical Race",
      description: "Race to solve the most puzzles in 1 minute on Lichess",
      url: "https://lichess.org/racer",
      icon: Trophy,
      color: "from-orange-500 to-amber-500",
      bgLight: "bg-orange-50",
      textColor: "text-orange-700",
      tag: "Puzzle Racer",
    },
    {
      title: "Tactical Blitz",
      description: "Puzzle Storm! Solve puzzles quickly before time runs out",
      url: "https://lichess.org/storm",
      icon: Zap,
      color: "from-violet-500 to-indigo-500",
      bgLight: "bg-violet-50",
      textColor: "text-violet-700",
      tag: "Puzzle Storm",
    },
    {
      title: "Solve Puzzles",
      description: "Improve your tactical vision with rating-targeted puzzles",
      url: "https://lichess.org/training",
      icon: Target,
      color: "from-pink-500 to-rose-500",
      bgLight: "bg-pink-50",
      textColor: "text-pink-700",
      tag: "Puzzles",
    },
    {
      title: "Play Game",
      description: "Play a live game online against players on Chess.com",
      url: "https://www.chess.com/play/online",
      icon: Swords,
      color: "from-emerald-500 to-teal-500",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
      tag: "Live Game",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user.name.split(" ")[0]}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your classes, submit feedback, or practice your chess skills below.
          </p>
        </div>
      </div>

      {/* Practice and Play Arena */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="flex items-center gap-2">
            <Image src="/image.png" alt="SMC Logo" width={24} height={24} className="object-contain" />
            Chess Play & Practice Arena
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {practiceCards.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${card.bgLight} ${card.textColor} transition-colors group-hover:scale-110 duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </div>
                
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-2">
                  {card.tag}
                </span>

                <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {card.description}
                </p>

                {/* Decorative bottom gradient bar on hover */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
              </a>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="py-6 text-sm text-slate-600">
          Fee status, feedback forms, and ticket support will be added in
          upcoming modules.
        </CardContent>
      </Card>
    </div>
  );
}
