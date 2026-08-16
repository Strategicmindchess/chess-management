Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
© 2025 Strategic Mind Chess. All Rights Reserved. Page 1 
 
♟ 
STRATEGIC MIND CHESS 
Tech Intern — Offer & Assignment Brief 
Chess Academy Management System (SMC CRM)  ·  2025 
 
Detail Information 
Document Type Internship Offer & Technical Assignment Brief 
Role Tech Intern — Full Stack Web Development 
Organisation Strategic Mind Chess (SMC), Jhansi, India 
Incubated At Bundelkhand Active Startup Incubation Council (BASIC) 
Project SMC CRM — Chess Academy Management System 
Reporting To SMC Co-Founders 
Engagement Type Internship — Fixed Term 
 
This document is your complete internship brief. It defines the product you are being hired to build, 
your responsibilities, the workflows you must implement, and what success looks like. Please read it in 
full before starting any work. 
 
  
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
01  /  WELCOME TO STRATEGIC MIND CHESS 
Dear Tech Intern, 
We are glad to have you on board at Strategic Mind Chess. SMC is a growing chess academy based in 
Jhansi, incubated at the Bundelkhand Active Startup Incubation Council (BASIC). We develop strategic 
thinkers through structured chess coaching, competitive tournaments, and progressive learning 
programs. 
You are joining us at an exciting stage. We are building the internal technology that will power 
everything SMC does — how we manage our coaches, how our students experience their learning 
journey, how we track fees and payouts, and how our operations run every single day. That technology 
is what you will be building. 
You are the sole technical person on this project. There is no other developer, no senior engineer to 
hand things off to, and no other tech intern working alongside you. The entire build is yours to own — 
from the database to the user interface. We say this not to overwhelm you, but to be clear: we are 
placing a significant amount of trust in you, and we expect the same level of seriousness in return. 
This document is your guide. It tells you what we are building, how it should work, and what we expect 
from you throughout this internship. 
Welcome to the team. 
— The Co-Founders, Strategic Mind Chess 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 2 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
© 2025 Strategic Mind Chess. All Rights Reserved. Page 3 
02  /  YOUR ROLE & RESPONSIBILITIES 
 
Tech Intern — Full Stack Web Development 
 
As SMC's Tech Intern, you are responsible for designing, building, testing, and delivering the SMC CRM 
— a Chess Academy Management System that our management team, coaches, students, and parents 
will use every day. 
You are the only technical person on this project. Every technical decision — architecture, database 
design, frontend implementation, integration work — is yours to own and deliver. Where you need 
guidance on product requirements or priorities, you report directly to the co-founders. 
 
What You Are Responsible For 
 
Area Your Responsibility 
Product Build Design and develop the complete SMC CRM as described in this brief — 
all modules, all user roles, all workflows 
Technical Decisions Choose your stack, architecture, and approach. We do not prescribe how 
you build — we hold you accountable for what you deliver 
Quality The system must be stable, usable, and free of critical bugs before real 
users — our coaches and students — go on it 
Data Integrity Student records, fee history, attendance logs, and payout data must be 
accurate and never lost 
Communication Regular progress updates to the co-founders. Flag blockers early — do not 
go quiet when things are stuck 
Documentation Document what you build so it can be maintained or handed to another 
developer in the future 
Handover At the end of the internship, deliver clean, organised source code with 
setup instructions 
 
What We Are Not Asking You to Do 
 – You are not responsible for marketing, social media, content, or student recruitment – You are not responsible for managing coaches or students — that is the management team's job – You are not required to build Phase 2 features (listed at the end of this brief) during this internship 
 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
03  /  WHAT YOU ARE BUILDING 
The SMC CRM — Chess Academy Management System 
The SMC CRM is an internal web-based platform that manages the complete operational lifecycle of the 
chess academy. It is not a public-facing website and it is not a chess game platform. It is the back-office 
and user portal system that keeps SMC running smoothly every day. 
Four types of users will log into this system: 
♛ 
⚙ 
Super Admin 
�
�🏫 
♟ 
Management Team 
Coach 
Student / Parent 
Each user logs in and sees only what is relevant to their role. Access control must be strictly enforced at 
the backend — not just hidden in the UI. 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 4 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
04  /  USER ROLES & ACCESS CONTROL 
Role-based access is one of the most important things you will build. Every permission boundary listed 
below must be enforced at the backend level, not just hidden in the interface. 
Admin  
The Admin role is held by the SMC Founders team. Admins have complete access to every module and 
every record on the platform. They can add, edit, and remove coaches and students, create and manage 
batch schedules, assign coaches and students to batches, approve or reject cancellation and 
rescheduling requests, manage fee records and payout structures, upload syllabus materials and 
resources, view all financial and operational reports, and manage and resolve support tickets. There are 
no restrictions on what an Admin can see or do — this role has full platform control. 
Coach 
Coaches see only what belongs to their assigned batches. They can join scheduled classes, mark 
attendance after class, log topics covered, set their availability, view feedback submitted by their 
students, raise a support ticket, and request a cancellation. They cannot see student fees, other coaches' 
payouts, or edit student records. 
Student / Parent 
Students can view upcoming classes and join them, submit monthly feedback, raise a support ticket, and 
check their own fee status. For 1-to-1 classes only, students can request a reschedule or cancellation — 
which goes to management for approval. Students cannot see coach payout information or access 
syllabus resources uploaded for coaches. 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 5 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
© 2025 Strategic Mind Chess. All Rights Reserved. Page 6 
05  /  MODULES YOU MUST BUILD 
All 13 modules below are required. None are optional. 
 
Each module describes what the system must do and why — not how you build it. Technical 
implementation is entirely your decision. What matters is that the outcome works correctly for the 
people using it. 
 
Module 1.  Class Scheduling System 
Management schedules a batch once. The system does the rest — automatically. – Management creates a batch schedule by defining: batch name/code, class days, time, assigned 
coach, and a permanent Google Meet link – Once a schedule is created, the system automatically generates all future class instances on the 
correct recurring days — no manual entry needed each week – Coaches see their upcoming classes on their dashboard without any manual input – Students in that batch see the same upcoming classes on their own dashboard – Every class instance displays: batch name, date, time, coach name, and a Join button 
 
Note: The Google Meet link is stored once per batch and does not change week to week. The system surfaces it 
automatically on every class instance. 
 
Module 2.  Join Class Feature 
One click to enter class. No copy-pasting links, no searching for meeting details. – Every scheduled class shows a Join button to both the coach and the enrolled students – Clicking Join opens the batch's permanent Google Meet link directly in the browser – The same link is used for every class in that batch — no new link per session – Students and coaches only see Join buttons for classes they are part of 
 
Module 3.  Cancellation & Rescheduling Workflow 
A structured approval process — no unilateral cancellations by anyone. – Coaches can submit a cancellation request for any of their classes — group or 1-to-1 – A reason is mandatory when submitting a request — the system must block submission without it – Coaches are limited to a maximum of 2 cancellations per calendar month — enforced by the system, 
not trust – All cancellation requests go to management for approval — a coach cannot cancel directly 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
© 2025 Strategic Mind Chess. All Rights Reserved. Page 7 – Once management approves, the class is marked cancelled and management reschedules it – For group classes: students cannot cancel. They can mark themselves absent or request the session 
recording – For 1-to-1 classes: students can submit a reschedule or cancellation request — management approves 
or rejects 
 
Coach / Student raises request   →   Management reviews   →   Approved or Rejected   →   Class marked 
cancelled   →   Management reschedules 
 
Module 4.  Coach Attendance & Class Log 
After every class, coaches log what happened. This becomes the official record. – After a class ends, the coach clicks 'Mark Class Held' on their dashboard – The form pre-fills with batch code, date, and time — coach adds topic covered and duration – The student list for that batch auto-populates — coach marks each student Present (P) or Absent (A) – Once submitted, the record is locked and becomes the official attendance log for that session – Management and Super Admin can view attendance logs per batch and per student – A class only counts toward coach payout once it is marked as held — this log is the trigger 
 
Module 5.  Coach Monthly Payout Automation 
Payouts are calculated automatically from class logs — no manual counting. – Management defines a payout rate per batch — for example, Batch A = Rs.300/session, Batch B = 
Rs.500/session – Every time a coach marks a class as held, the system automatically adds the corresponding amount to 
that coach's running monthly total – At month end, the system generates a payout summary per coach: sessions held per batch, rate, and 
total amount due – Management can change the payout rate for any batch at any time — changes apply forward only, 
not retroactively – Coaches can view their own monthly payout summary only — no visibility into other coaches' figures 
 
Module 6.  Coach Availability Module 
Coaches set when they are free. Management uses this to plan scheduling. – Coaches define their weekly availability by day and time range — e.g. Monday 4 PM to 8 PM, Saturday 
10 AM to 2 PM 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
© 2025 Strategic Mind Chess. All Rights Reserved. Page 8 – This availability is visible to management when assigning demo classes, trial sessions, parent-teacher 
meetings, or replacement classes – Coaches can update their availability at any time – Management can view all coaches' availability together when planning new scheduling 
 
Module 7.  Student Management Module 
A complete student record — personal, chess, and financial details in one place. – Every student profile stores: full name, parent name, student phone, parent phone, and city – Chess details: Chess.com ID, Lichess ID, current rating, assigned coach, and assigned batch – Fee details: joining date, monthly fee amount, and per-session fee amount – Management and Super Admin can create, view, and edit all student records – Coaches can view the names and chess details of students in their own batches only — no fee 
visibility, no editing 
 
Module 8.  Fee Tracking System 
A rolling fee ledger per student — management always knows who has paid and who has not. – Every student has a fee ledger covering a 12-month window — the previous 6 months and the 
upcoming 6 months – Each month shows one of three statuses: Paid, Pending, or Waived – Management can change the status of any month for any student using a dropdown – No payment gateway integration is required in this phase — status is updated manually by 
management – Students can see only their own fee status — they cannot see amounts or change any status 
 
Module 9.  Student Feedback System 
Monthly structured feedback — students rate their experience, coaches see the results. – At the end of each month, students receive a feedback form – The form asks: Class Engagement (Excellent / Good / Average / Bad), Understanding of Topic 
(Excellent / Good / Average / Bad), and a written Coach Feedback field – The written coach feedback field requires a minimum of 5 lines — the system must block submission 
without this – Coaches can view the feedback submitted for their own batches only – Management and Super Admin can view all feedback across all batches 
 
Note: Clarify with co-founders before building: should the feedback form be sent automatically at month end, or 
triggered manually by management? 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
© 2025 Strategic Mind Chess. All Rights Reserved. Page 9 
 
Module 10.  Ticket Management System 
A structured support channel — issues are logged, assigned, tracked, and closed. – Both students and coaches can raise a support ticket from their dashboard – Categories available: Technical Issue, Payment Issue, Rescheduling, Batch Issue, Coach Issue, Student 
Issue, Other – Once raised, the ticket appears with management who assign it and work to resolve it – Ticket status moves through: Raised → Assigned → Resolved → Closed – The person who raised the ticket can see the current status at all times – Management and Super Admin can see all tickets and their full history 
 
Ticket Raised   →   Management Assigns   →   Issue Resolved   →   Ticket Closed 
 
Module 11.  Syllabus & Resource Management 
Coaches get the materials they need. Students do not see what is not meant for them. – Management can upload and organise resources: PGN files, PDFs, Google Drive links, homework 
assignments, test links, and training materials – Resources are tagged to specific batches or topics – Only coaches can access these resources — students have zero visibility into this section – Management and Super Admin can add, update, and delete resources at any time 
 
Module 12.  Coach Performance Evaluation Dashboard 
A monthly scorecard for every coach — automatically calculated from platform data. – The system calculates each coach's monthly performance score from data already logged in the 
platform – Metrics: Attendance Adherence (target 95%), Topic Completion (target 100%), Student Feedback 
Score (target 4.5/5), PGN Upload Rate (target 100%), Recording Upload Rate (target 100%), 
Punctuality (target 95%) – Each metric shows actual performance against its target – The dashboard generates an overall score, a trend graph over previous months, strength areas, and 
areas needing improvement – Super Admin and Management can view all coaches' evaluations – Coaches can view only their own evaluation 
 
 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
Module 13.  Dashboards 
Every user lands on a dashboard that shows exactly what they need — nothing more. – Super Admin Dashboard: total students, total coaches, active batches, total revenue, pending fees, 
open tickets, top-performing coaches – Management Dashboard: today's scheduled classes, pending approval requests (cancellations, 
reschedules), open tickets, fee collection status – Coach Dashboard: today's classes with Join button, monthly payout summary, attendance log 
summary, student feedback received, availability calendar – Student Dashboard: upcoming classes with Join button, fee status, option to raise a ticket, option to 
submit monthly feedback 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 10 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
06  /  OPEN QUESTIONS — CLARIFY BEFORE YOU BUILD 
The following items need a decision from the co-founders before you implement them. Do not assume 
— ask. 
Item 
Question to raise with Co-Founders 
Feedback form trigger 
Should the monthly feedback form go out automatically on the last day of 
the month, or should management send it manually? 
Notification method 
How should the system notify users of upcoming classes, approvals, and 
ticket updates in Phase 1 — email only, or another method? 
Recording upload 
When a student requests a recording, who uploads it and where does it 
live — Google Drive link stored in the platform, or direct upload? 
Fee gateway 
Confirm there is no payment gateway integration required in Phase 1 — 
fee status is manual only. 
Student login method 
Should students and parents log in with phone number and OTP, or 
username and password? 
Hosting preference 
Is there a preferred hosting environment, or is the choice left to you? 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 11 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
07  /  PHASE 2 — NOT IN SCOPE FOR THIS INTERNSHIP 
These features are planned for a future phase. They are listed so you are aware of where the product is 
heading. Build Phase 1 in a way that does not make these features impossible to add later — but you 
are not required to build them now. – WhatsApp reminders and notifications via AIsensy (official WhatsApp Business API) – Automated attendance detection via Google Meet API – AI-powered coach evaluation and insights – Student chess rating progress graph linked to Chess.com and Lichess – Parent-teacher meeting (PTM) scheduling module – Tournament creation and management – Certificate generation for students – Homework tracking and submission 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 12 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
08  /  HOW WE WILL WORK TOGETHER 
What We Expect From You – Build the system described in this brief — all 13 modules, all 4 user roles, all workflows – Communicate your progress regularly — weekly updates at minimum – Raise questions and blockers early — do not stay stuck silently – Take ownership of your technical decisions and be ready to explain them – Write clean, readable code — this will be maintained after you leave – Test everything before marking something as done – Deliver complete, documented source code at the end of the internship 
What You Can Expect From Us – Clear answers to your questions about product requirements and priorities – Prompt decisions when you need a call made to move forward – Access to our coaching team and operations staff for workflow clarification – An internship certificate on successful completion – A strong, honest reference letter from the co-founders – Recognition — if the product you build is exceptional, we will say so publicly 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 13 
Strategic Mind Chess  |  Tech Intern Offer & Assignment Brief  ·  CONFIDENTIAL 
09  /  A FINAL NOTE 
This is a real product that real people will use every day. The coaches who will mark their attendance on 
this platform are teaching children. The parents who will check fee statuses here are trusting SMC with 
their children's education. The co-founders who will view reports here are making decisions that affect 
the academy's future. 
We understand you are an intern and we are not expecting perfection from day one. What we are 
expecting is genuine effort, honest communication, and a product that works correctly when it is time to 
launch. 
Build something you would be proud to put your name on. 
We are rooting for you. 
— The Co-Founders, Strategic Mind Chess 
♟   Strategic Mind Chess  ·  Where Strategic Thinkers Are Made   ♟ 
© 2025 Strategic Mind Chess. All Rights Reserved. 
Page 14 
Phase 2 -- Week 2: Chess.com / Lichess Leaderboard
1. Chess.com & Lichess.org Account Integration
Every student profile should have the option to link a Chess.com Username and a Lichess Username. The system should automatically fetch activity data from both platforms and generate the leaderboard without any manual entry.
Data to Fetch
●	Rapid games played sum ho gaya total 
●	Blitz games played total ho gaya 
●	Classical games played total ho gaya 
●	Puzzle attempts
●	Rapid Rating
●	Rapid + Blitz Win Rate
●	Puzzle Success Rate
●	Daily activity (for streak calculation)
The system should combine activity from Chess.com + Lichess.
2. Automatic Leaderboard
●	Weekly Leaderboard
●	Monthly Leaderboard
Maximum Possible Score: 1000 Points. The leaderboard should automatically refresh whenever new activity is fetched.
3. Leaderboard Point System
A. Games Played
●	Rapid + Classical Games: 2 points per game, max 87 games counted, max 174 points
●	Blitz Games: 1 point per game, max 51 games counted, max 51 points
B. Puzzle Solving
●	0.5 point per puzzle solved, max 450 puzzles counted, max 225 points
C. Game Win Rate Bonus (combined Rapid + Blitz)
●	Win Rate > 50% → +75 Points
●	Win Rate < 50% → −50 Points
D. Puzzle Accuracy Bonus
●	Puzzle Success Rate > 70% → +50 Points
●	Puzzle Success Rate < 70% → −25 Points
E. Rating Improvement Bonus (New)
Based on Rapid Rating improvement. Award +25 points for every +50 rating gained. Maximum Bonus = 100 Points. Resets every month.
●	+50 Rating = +25
●	+100 Rating = +50
●	+150 Rating = +75
●	+200 Rating or above = +100
F. Consistency Bonus (New)
Based on continuous daily activity across Chess.com and Lichess combined.
●	7-Day Streak = +5
●	14-Day Streak = +10
●	21-Day Streak = +15
●	30-Day Streak = +25
Maximum Bonus = 25 Points.
Important Rule: Once the maximum points for a category are reached, no additional points should be awarded. Scores should never exceed the category limit.
4. Coach Feedback Module (50 Marks)
Add a Student Feedback section inside the Coach Portal. Every month the coach can award marks (0–10) in:
●	Student Engagement
●	Behaviour in Class
●	Concept Adoption
●	Joining on Time
●	Camera On During Class
Maximum = 50 Marks.
5. Attendance Score (50 Marks)
Already implemented. Attendance ≥ 75% → 50 Marks; Attendance < 75% → 0 Marks.
6. Assignment Score (100 Marks)
Automatically calculated based on assignment completion: All Completed → 100 Marks; Around Half Completed → 50 Marks; No Assignments Completed / All Pending → 0 Marks.
7. Weekly Tournament Score (100 Marks)
Weekly online tournaments (primarily Lichess). Coach can manually award 0–100 Marks based on Participation, Performance, and Sportsmanship.
Note: Bullet/ultra-bullet games score 0 points; if a student plays more than 50 bullet/ultra-bullet games in a month, apply −200 points.
8. Leaderboard Rewards Section
Display the monthly rewards beside the leaderboard:
Rank	Reward
1st	1 Month Chess.com Premium Membership
2nd	1 Month Chess.com Gold Membership
3rd	Dairy Milk Chocolate
4th - 10th	Opportunity to play a Live Game against the Head Coach

9. Special Monthly Award
“Highest Puzzle Solver of the Month” — awarded to the student with the highest total number of puzzles solved (Chess.com + Lichess combined). This award is independent of leaderboard ranking. Prize: ₹100 Cash Reward.
10. Rule Book / Point System Section
Inside the Leaderboard page, add a “Rule Book / Point System” tab explaining the complete point calculation, category-wise maximums, reward details, important rules, and Fair Play policy. Students should be able to access it anytime.
11. Overall Score Calculation
Category	Maximum Points
Rapid + Classical Games	174
Blitz Games	51
Puzzle Solving	225
Game Win Rate Bonus	75
Puzzle Accuracy Bonus	50
Rating Improvement Bonus	100
Consistency Bonus	25
Coach Feedback	50
Attendance	50
Assignments	100
Weekly Tournament	100
Total	1000

12. Leaderboard UI Requirements
The leaderboard should display: Student Rank, Student Name, Profile Picture, Total Score, Chess.com Username, Lichess Username.
Clicking a profile should show a detailed score breakdown:
●	Rapid + Classical Points
●	Blitz Points
●	Puzzle Points
●	Win Rate Bonus
●	Puzzle Accuracy Bonus
●	Rating Improvement Bonus
●	Consistency Bonus
●	Coach Feedback
●	Attendance
●	Assignments
●	Tournament Score
●	Total Score
Notes
●	Weekly and Monthly leaderboards should recalculate automatically.
●	Activity should be fetched automatically from Chess.com and Lichess.
●	Scores must never exceed category limits.
●	Once the monthly leaderboard resets, the monthly rating improvement and consistency bonus should also reset.
●	Fair Play is mandatory — admin can disqualify a flagged student from the leaderboard for that period.
