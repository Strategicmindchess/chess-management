import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import Link from "next/link";
import { ArrowLeft, BookOpen, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachGuidePage() {
  await requireRole([Role.TEACHER]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link
          href="/teacher"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <BookOpen className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SMC Class Guide</h1>
            <p className="text-slate-400">Official Class Structure, Student Improvement & Coaching Procedure</p>
          </div>
        </div>

        <div className="text-slate-300 leading-relaxed text-base">
          
          <h3 className="text-xl font-bold text-blue-400 mt-8 mb-4">1. Purpose of Every Class</h3>
          <p className="mb-4">
            The primary purpose of every SMC class is to improve the student's chess understanding, playing strength, decision-making and rating.
          </p>
          <p className="mb-4">Every coach must consistently focus on:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-amber-500">
            <li>Student rating improvement</li>
            <li>Regular chess game practice</li>
            <li>Regular puzzle solving</li>
            <li>Correction of weaknesses</li>
            <li>Practical application of concepts</li>
            <li>Consistent progress tracking</li>
          </ul>
          <p className="font-bold text-white">A class should never become only a lecture. Students must actively think, solve, play, discuss and improve.</p>

          <hr className="border-slate-700/50 my-8" />

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-red-400 flex items-center gap-2 mt-0 mb-4">
              <AlertTriangle className="w-6 h-6" />
              IMPORTANT CLASS QUALITY ALERT
            </h2>
            <div className="space-y-4 text-red-200 font-semibold">
              <p>A COACH MUST NOT LEAVE STUDENTS ALONE IN THE CLASS TO PLAY GAMES.</p>
              <p>Leaving students to play games without the coach's active supervision is a serious CLASS QUALITY BREACH.</p>
              <p>Applicable penalty will be imposed for this violation.</p>
              <p>Repeatedly leaving students unsupervised or regularly committing this breach may lead to TERMINATION OF THE COACHING CONTRACT.</p>
            </div>
          </div>

          <p className="mb-4">The coach must remain actively involved in the class by:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-amber-500">
            <li>Observing the student's games</li>
            <li>Asking questions</li>
            <li>Checking the student's thought process</li>
            <li>Identifying mistakes</li>
            <li>Discussing critical positions</li>
            <li>Giving feedback</li>
            <li>Guiding the student during practical play</li>
          </ul>
          <p className="font-bold">Students may play games during class only as a supervised learning activity—not as a replacement for coaching.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">2. Student Improvement Cycle</h2>
          <p className="mb-4">Every class should follow this improvement cycle:</p>
          <div className="bg-[#11141c] p-4 rounded-lg text-center font-bold text-amber-400 my-4 text-sm sm:text-base border border-slate-700/50">
            Assess → Teach → Practice → Play → Analyze → Correct → Track → Improve
          </div>
          <p className="mb-4 mt-6">The coach must identify what the student needs, teach the relevant concept, provide practical training and review the student's performance.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">3. Standard Class Structure</h2>
          
          <h3 className="text-xl font-bold text-blue-400 mt-8 mb-4">A. Welcome & Progress Check — 2 Minutes</h3>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-blue-500">
            <li>Greet the student professionally.</li>
            <li>Ask about the student's week.</li>
            <li>Check whether the student played chess regularly.</li>
            <li>Ask whether the student solved puzzles.</li>
            <li>Discuss any recent tournament or game experience.</li>
            <li>Identify the student's current difficulty.</li>
          </ul>

          <h3 className="text-xl font-bold text-blue-400 mt-8 mb-4">B. Revision & Previous Assignment — 5–7 Minutes</h3>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-blue-500">
            <li>Review the previous class topic.</li>
            <li>Check the assigned puzzles or games.</li>
            <li>Ask the student to explain the concept in their own words.</li>
            <li>Correct misunderstandings.</li>
            <li>Do not skip assignments without a valid reason.</li>
          </ul>

          <h3 className="text-xl font-bold text-blue-400 mt-8 mb-4">C. Concept Explanation — 10–15 Minutes</h3>
          <p className="mb-4">Teach one clear and relevant concept according to the student's level. The coach should:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-blue-500">
            <li>Explain in simple language.</li>
            <li>Use practical examples.</li>
            <li>Ask questions during the explanation.</li>
            <li>Avoid unnecessary theory overload.</li>
            <li>Connect the topic with real games.</li>
            <li>Confirm that the student understands the idea.</li>
          </ul>

          <h3 className="text-xl font-bold text-blue-400 mt-8 mb-4">D. Student Puzzles & Practical Training — 15–20 Minutes</h3>
          <p className="mb-4">The student must actively solve positions and demonstrate their thinking. The coach should:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-blue-500">
            <li>Give suitable puzzles.</li>
            <li>Allow the student to calculate independently.</li>
            <li>Ask, "What are the candidate moves?"</li>
            <li>Ask about threats, checks, captures and plans.</li>
            <li>Avoid giving the answer too quickly.</li>
            <li>Explain the reason behind the correct move.</li>
            <li>Track recurring tactical and calculation mistakes.</li>
          </ul>

          <h3 className="text-xl font-bold text-blue-400 mt-8 mb-4">E. Game Analysis & Rating Improvement Focus — 5–10 Minutes</h3>
          <p className="mb-4">Review the student's recent games or selected positions. Focus on:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 list-disc pl-8 mb-6 marker:text-blue-500">
            <li>Opening mistakes</li>
            <li>Tactical oversights</li>
            <li>Calculation errors</li>
            <li>Poor time management</li>
            <li>Missed opportunities</li>
            <li>Endgame weaknesses</li>
            <li>Decision-making problems</li>
            <li>Repeated mistakes affecting rating</li>
          </ul>
          <p className="mb-4">The coach must explain:</p>
          <ol className="list-decimal pl-8 space-y-2 mb-6 text-slate-300">
            <li>What went wrong?</li>
            <li>Why did it happen?</li>
            <li>What should the student do next time?</li>
            <li>What practice will help correct it?</li>
          </ol>

          <h3 className="text-xl font-bold text-blue-400 mt-8 mb-4">F. Assignment & Closing — 2 Minutes</h3>
          <p className="mb-4">Every class should end with a clear action plan. The coach may assign:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-blue-500">
            <li>Chess games to play</li>
            <li>Tactical puzzles</li>
            <li>Opening revision</li>
            <li>Endgame practice</li>
            <li>Game analysis</li>
            <li>Specific positional exercises</li>
            <li>A particular weakness to focus on</li>
          </ul>
          <p className="font-bold text-white">The student should clearly understand what to do before the next class.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">4. Rating Improvement System</h2>
          <p className="mb-4">The coach must consistently monitor the student's progress. Important details to track:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 list-disc pl-8 mb-6 marker:text-amber-500">
            <li>Current Chess.com/Lichess rating</li>
            <li>Previous rating</li>
            <li>Rating trend</li>
            <li>Number of games played</li>
            <li>Game performance</li>
            <li>Puzzle-solving consistency</li>
            <li>Common mistakes</li>
            <li>Assignment completion</li>
            <li>Tournament performance</li>
            <li>Current strengths and weaknesses</li>
          </ul>

          <h4 className="text-lg font-bold text-slate-200 mt-8 mb-4">Review Frequency</h4>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-amber-500">
            <li><strong>Every class:</strong> Check recent practice and mistakes.</li>
            <li><strong>Every week:</strong> Review progress and training consistency.</li>
            <li><strong>Every month:</strong> Evaluate rating trend and improvement areas.</li>
            <li><strong>Every quarter:</strong> Prepare a broader progress review.</li>
          </ul>
          <p className="mb-4">The coach must focus on long-term improvement rather than only completing the class syllabus.</p>
          <p className="font-bold text-white">Rating improvement cannot be guaranteed, but consistent, structured and measurable coaching must always be provided.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">5. Regular Chess Games Are Mandatory Practice</h2>
          <p className="mb-4">Students should be encouraged to play chess regularly outside class. The coach must guide the student regarding:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-amber-500">
            <li>Suitable time controls</li>
            <li>Number of games per week</li>
            <li>Playing with concentration</li>
            <li>Avoiding random or careless games</li>
            <li>Reviewing games after playing</li>
            <li>Identifying repeated mistakes</li>
            <li>Applying class concepts in real games</li>
          </ul>
          <p className="mb-4">Playing games is important because students need to convert knowledge into practical decision-making.</p>
          <p className="font-bold text-white">The coach should regularly ask how many games the student played and what they learned from those games.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">6. Regular Puzzle Solving Is Mandatory Practice</h2>
          <p className="mb-4">Puzzle solving should be a regular part of the student's training routine. The coach should monitor:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-amber-500">
            <li>Puzzle-solving frequency & Accuracy</li>
            <li>Calculation depth & Tactical patterns</li>
            <li>Speed versus accuracy</li>
            <li>Repeated tactical errors</li>
          </ul>
          <p className="mb-4 mt-6">Students should be encouraged to solve puzzles consistently rather than only before class. Suitable puzzle areas may include:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 list-disc pl-8 mb-6 marker:text-amber-500">
            <li>Checks, captures and threats</li>
            <li>Forks, Pins, Skewers</li>
            <li>Discovered attacks</li>
            <li>Removing the defender</li>
            <li>Back-rank tactics</li>
            <li>Calculation</li>
            <li>Defensive tactics</li>
            <li>Endgame tactics</li>
          </ul>
          <p className="font-bold text-white">Regular puzzle solving improves tactical awareness, calculation and practical performance.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">7. Student Progress Tracking</h2>
          <p className="mb-4">The coach should maintain a clear understanding of each student's development. Track:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 list-disc pl-8 mb-6 marker:text-amber-500">
            <li>Topics completed</li>
            <li>Topics requiring revision</li>
            <li>Rating changes</li>
            <li>Game count & Puzzle count</li>
            <li>Strengths & Weaknesses</li>
            <li>Attendance & Assignment completion</li>
            <li>Behaviour and participation</li>
            <li>Coach's next action plan</li>
          </ul>
          <p className="font-bold">Every student should have an improvement direction—not just a list of completed topics.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">8. Personalized Improvement Plan</h2>
          <p className="mb-4">The coach must adapt the training according to the student's actual needs. For example:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-amber-500">
            <li>A student losing games tactically needs tactical training.</li>
            <li>A student losing winning positions needs conversion practice.</li>
            <li>A student struggling in openings needs opening principles and plans.</li>
            <li>A student making time-management mistakes needs clock and decision training.</li>
            <li>A student lacking endgame knowledge needs practical endgame sessions.</li>
            <li>A student not improving due to low practice needs a stronger game and puzzle routine.</li>
          </ul>
          <p className="font-bold text-amber-400">Teaching the same material to every student without considering their weaknesses is not effective coaching.</p>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">9. Class Quality Checklist</h2>
          <p className="mb-4">Before ending the class, the coach should ensure:</p>
          <ul className="list-none pl-0 space-y-2">
            {[
              "The student understood the main concept.",
              "The student actively participated.",
              "The student solved practical positions.",
              "The student's doubts were addressed.",
              "Recent games or mistakes were discussed.",
              "Rating improvement was considered.",
              "Regular game practice was discussed.",
              "Regular puzzle practice was discussed.",
              "Homework or assignments were given.",
              "The coach remained actively present throughout the class.",
              "The student was not left alone to play games.",
              "The next improvement focus was clearly decided."
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-300">
                <div className="w-5 h-5 rounded bg-brand-500/20 border border-brand-500/50 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-400" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <hr className="border-slate-700/50 my-8" />

          <h2 className="text-2xl font-bold text-amber-400 mt-10 mb-6 border-b border-slate-700/50 pb-3">10. Professional Coaching Rules</h2>
          <p className="mb-4">Every SMC coach must:</p>
          <ul className="list-disc pl-8 space-y-2 mb-6 text-slate-300 marker:text-amber-500">
            <li>Start and end classes on time.</li>
            <li>Remain attentive throughout the class.</li>
            <li>Maintain professional communication.</li>
            <li>Keep the student actively involved.</li>
            <li>Avoid unnecessary distractions.</li>
            <li>Never leave the student alone to play games.</li>
            <li>Never use games as a substitute for coaching.</li>
            <li>Give constructive and respectful feedback.</li>
            <li>Maintain student progress records.</li>
            <li>Focus on continuous improvement.</li>
            <li>Follow SMC teaching standards and quality requirements.</li>
          </ul>

          <div className="bg-brand-900/30 border border-brand-500/30 rounded-xl p-6 mt-10 text-center">
            <h3 className="text-brand-400 mt-0 mb-3">Final Coaching Principle</h3>
            <p className="text-lg font-bold text-white mb-4">
              Better Understanding → Better Practice → Better Games → Better Decisions → Better Playing Strength → Better Rating
            </p>
            <p className="mb-0 text-slate-300">
              Every SMC coach is responsible for making each class meaningful, supervised, practical and improvement-oriented.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
