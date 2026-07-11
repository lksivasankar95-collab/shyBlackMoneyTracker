const DAILY_TIPS = [
  // Expense Tracking
  "Track every expense, no matter how small. Awareness is the first step to financial control.",
  "Log your transactions the same day. Delayed entries lead to missed spending patterns.",
  "Categorise your expenses weekly. You cannot manage what you do not measure.",
  "Review your last 30 days of spending before making any new financial decisions.",
  "Take a photo of every receipt and store it digitally. Paper receipts fade quickly.",
  "Set a daily 2-minute habit: open your finance app and record what you spent today.",
  "Check your bank statement every Sunday. Spot errors and unexpected charges early.",
  "Separate wants from needs before logging. It builds awareness over time.",
  "Use consistent category labels for expenses. This makes monthly comparisons accurate.",
  "If you forget to track for a day, check your bank app and backfill the entries.",

  // Saving Habits
  "Pay yourself first. Transfer savings to a separate account on the day you receive income.",
  "Start with saving just 5% of your income. Increase it by 1% every three months.",
  "Automate your savings. What you never see in your main account, you will not spend.",
  "Save windfalls completely. Bonuses, gifts, and tax refunds belong in your savings.",
  "Round up every purchase to the nearest 100 and save the difference.",
  "Save before you spend. Savings should be an expense, not whatever is left over.",
  "Open a separate savings account with a different bank to reduce the temptation to withdraw.",
  "Set a savings goal with a deadline. Goals with dates are far more achievable.",
  "Even saving ₹50 per day adds up to ₹18,000 in a year. Small amounts compound.",
  "Celebrate savings milestones. It reinforces the habit of saving consistently.",

  // Budgeting
  "Create a monthly budget before the month begins, not after you have already spent.",
  "Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt repayment.",
  "Budget for irregular expenses like annual insurance premiums by dividing them monthly.",
  "A budget is not a punishment. It is a plan that gives your money a purpose.",
  "Review your budget mid-month. Adjust if a category is already overspent.",
  "Include a fun category in your budget. Deprivation leads to overspending later.",
  "Budget for 'surprise' expenses each month. Car repairs and medical costs are predictable in their unpredictability.",
  "Never budget based on your best income month. Use your average over 6 months.",
  "Zero-based budgeting assigns every rupee a job before the month begins.",
  "If you go over budget in one category, reduce another to compensate immediately.",

  // Emergency Fund
  "Build an emergency fund of at least 3 months of your expenses before investing.",
  "Keep your emergency fund in a liquid savings account, not investments.",
  "Your emergency fund is not a general savings account. Only access it for genuine emergencies.",
  "Start your emergency fund with ₹5,000. The first milestone matters most.",
  "After using your emergency fund, make rebuilding it your top financial priority.",
  "An emergency fund prevents you from taking on debt when life gets unpredictable.",
  "Calculate your monthly essential expenses and multiply by 6 for a strong emergency fund.",
  "Keep your emergency fund in a high-yield savings account so it earns interest while waiting.",
  "A job loss emergency fund should cover 6 to 9 months of full living expenses.",
  "Having an emergency fund is the single best way to avoid a debt spiral.",

  // Debt Management
  "List all your debts with their interest rates. Attack the highest-rate debt first.",
  "The avalanche method saves the most interest: pay minimums on all, extra on highest rate.",
  "The snowball method builds momentum: pay minimums on all, extra on the smallest balance.",
  "Never skip the minimum payment on any debt. Late fees and credit damage cost more.",
  "Stop creating new debt before trying to pay off existing debt.",
  "Negotiate your interest rate with your lender. A single call can save thousands.",
  "Consolidate multiple high-interest debts into one lower-interest loan if possible.",
  "Every extra rupee paid on a loan principal reduces future interest permanently.",
  "Avoid payday loans. Their annualised interest rates are among the highest available.",
  "Being debt-free is not just financial freedom. It is mental peace as well.",
  "Pay more than the minimum on credit cards. Minimum payments are designed to keep you in debt.",
  "Treat debt repayment like a bill. Schedule it as a fixed monthly expense.",

  // Investing Basics
  "Start investing as early as possible. Time in the market beats timing the market.",
  "Diversify your investments across asset classes to reduce risk.",
  "Invest regularly through SIPs. Consistent small amounts beat irregular large amounts.",
  "Understand what you invest in. If you cannot explain it simply, learn more first.",
  "Reinvest dividends and returns. Compounding accelerates wealth building significantly.",
  "Index funds offer broad diversification at very low cost for long-term investors.",
  "Do not check your investment portfolio daily. Short-term fluctuations create unnecessary anxiety.",
  "Risk and return are linked. Higher potential returns always carry higher potential losses.",
  "A long-term investment horizon of 10 or more years smooths out market volatility.",
  "Never invest money you cannot afford to lose or will need within 2 years.",
  "Review your investment portfolio once every quarter, not every day.",
  "Dollar-cost averaging through regular SIPs removes the stress of timing the market.",

  // Credit Score Habits
  "Pay all your EMIs and credit card bills on time, every single month.",
  "Keep your credit utilisation below 30% of your total credit limit.",
  "Do not apply for multiple credit cards or loans in a short period. It hurts your score.",
  "Check your credit report at least once a year and dispute any errors you find.",
  "A long credit history improves your score. Do not close your oldest credit card.",
  "Having a mix of credit types — card, home loan, personal loan — can improve your score.",
  "Your credit score determines the interest rate you get on loans. A good score saves lakhs.",
  "Even one missed EMI can drop your credit score by 50 to 100 points.",
  "A credit score above 750 qualifies you for the best loan interest rates.",
  "Becoming a loan guarantor affects your own credit score if the borrower defaults.",

  // Financial Planning
  "Write down your short-term, medium-term, and long-term financial goals today.",
  "A financial plan is not optional at any income level. Everyone needs one.",
  "Review your financial plan at least twice a year and update it after life changes.",
  "Calculate your net worth every year: assets minus liabilities. Watch it grow.",
  "Involve your spouse or partner in financial planning. Financial misalignment causes stress.",
  "Plan for inflation. ₹1 lakh today will be worth less in 10 years.",
  "Define what financial independence means to you personally, then plan towards it.",
  "Have a will. Estate planning protects your family regardless of your age or wealth.",
  "Set a date to review your financial plan every six months and treat it as a meeting.",
  "A certified financial planner can provide objective advice tailored to your situation.",

  // Smart Spending
  "Wait 24 hours before making any unplanned purchase above ₹1,000.",
  "Compare prices across at least three sources before any significant purchase.",
  "Buy quality items less often rather than cheap items repeatedly. Cost-per-use matters.",
  "Unsubscribe from marketing emails to reduce impulse purchase triggers.",
  "Meal planning and cooking at home can save 40 to 60% on food expenses monthly.",
  "Never shop when hungry, tired, or emotionally stressed. Impulse spending peaks then.",
  "Use cash or a debit card for discretionary spending. It makes spending feel more real.",
  "Avoid shopping as entertainment. Find free or low-cost hobbies to fill leisure time.",
  "Check your subscription list every three months and cancel what you do not use.",
  "Buy second-hand for items you need, not for social status.",
  "Use a shopping list every time you go to the store. Stick to it.",
  "The best deal on something you do not need is still a waste of money.",

  // Wealth Building
  "Wealth is not about income. It is about the gap between what you earn and what you spend.",
  "The fastest way to build wealth is to increase income while keeping expenses flat.",
  "Invest in skills that increase your earning potential. Education is compound interest.",
  "Real estate, equities, gold, and bonds each play a role in a balanced wealth portfolio.",
  "Build multiple income streams over time. A single income source is a single point of failure.",
  "The most powerful wealth-building tool is a high savings rate over a long period.",
  "Avoid lifestyle inflation. Every raise is an opportunity to increase savings, not spending.",
  "Passive income — rentals, dividends, royalties — is wealth working while you sleep.",
  "Wealthy people spend less than they earn. It sounds simple because it is.",
  "Patience is the most underrated wealth-building strategy. Long-term thinking wins.",
  "Invest in assets that appreciate. Avoid assets that depreciate rapidly.",
  "Surround yourself with financially disciplined people. Habits are contagious.",

  // Insurance Awareness
  "Term life insurance should be 10 to 15 times your annual income.",
  "Never mix insurance with investment. Buy pure term insurance and invest separately.",
  "Health insurance is not optional. One medical emergency without cover can wipe out savings.",
  "Review your insurance policies every year. Life circumstances change your coverage needs.",
  "A comprehensive family floater health plan covers all members under one premium.",
  "Critical illness insurance covers diseases like cancer where treatment costs are extreme.",
  "Vehicle insurance is mandatory and also protects you from significant financial liability.",
  "Read your insurance policy document fully. Know exactly what is and is not covered.",
  "Do not let an insurance policy lapse. Reinstating it costs more and loses continuity.",
  "Accidental disability insurance protects your income if you cannot work due to an accident.",

  // Tax Awareness
  "Section 80C allows deductions up to ₹1.5 lakh per year through ELSS, PPF, and EPF.",
  "Keep all financial documents and tax proofs organised throughout the year, not just at filing time.",
  "Filing your income tax return on time, even if no tax is due, builds a strong financial record.",
  "HRA exemption can significantly reduce your taxable income if you pay rent.",
  "Medical expenses and health insurance premiums are deductible under Section 80D.",
  "Tax-saving investments should align with your financial goals, not just the tax benefit.",
  "NPS contributions offer additional tax deductions under Section 80CCD(1B) up to ₹50,000.",
  "A tax refund is not a bonus. It means you overpaid the government an interest-free loan.",
  "Capital gains tax differs for short-term and long-term holdings. Plan exits accordingly.",
  "Home loan interest deductions under Section 24 can reduce your tax burden significantly.",
  "Do not delay tax planning to March. Start at the beginning of the financial year.",

  // Retirement Planning
  "Start retirement planning the day you receive your first salary. Time is everything.",
  "Estimate your retirement corpus by multiplying expected annual expenses by 25.",
  "The EPF is a powerful retirement tool. Maximise your voluntary contribution.",
  "PPF provides tax-free returns and is ideal for the debt portion of a retirement portfolio.",
  "National Pension System (NPS) offers market-linked returns with a tax-efficient structure.",
  "Do not withdraw from your EPF when you change jobs. Let it compound.",
  "Plan for healthcare costs in retirement. Medical inflation is higher than general inflation.",
  "A retirement plan that relies on children's support is not a plan. Build your own corpus.",
  "Calculate how many years until retirement and how much you need to save monthly to reach your goal.",
  "Inflation means you need more money at retirement than you think today. Plan conservatively.",
  "Review your retirement plan annually and increase contributions as your income grows.",
  "A mix of equity and debt in your retirement portfolio adjusts based on your age and risk.",

  // Fraud Prevention
  "Never share your OTP, PIN, or CVV with anyone, including bank representatives.",
  "Verify the identity of anyone requesting financial information before sharing anything.",
  "Use unique passwords for each financial account. A password manager helps.",
  "Enable two-factor authentication on all banking and payment apps immediately.",
  "Be suspicious of offers that seem too good to be true. They always are.",
  "Official organisations never ask for your bank details or OTP over a phone call.",
  "Check your bank account and card statements weekly for unauthorised transactions.",
  "If you suspect fraud, freeze your account or card immediately through the app or call.",
  "Phishing emails mimic legitimate banks. Always go directly to the official website.",
  "Never click links in SMS or email claiming to be from your bank. Log in directly.",
  "Investment schemes promising guaranteed high returns are almost always fraudulent.",

  // Digital Payment Safety
  "Only use trusted and official payment apps from verified sources.",
  "Never save card details on unknown or unverified websites.",
  "Use virtual card numbers for online shopping to protect your main card details.",
  "Log out of payment apps on shared or public devices immediately after use.",
  "Enable transaction alerts for all accounts so you see every debit in real time.",
  "Verify the UPI ID or account number carefully before initiating any transfer.",
  "Set daily transaction limits on your UPI and mobile banking to minimise fraud risk.",
  "Use official bank apps rather than third-party apps for sensitive transactions.",
  "Avoid making financial transactions on public Wi-Fi networks.",
  "Check the padlock icon and HTTPS in the browser before entering payment details.",
  "Screenshot every successful online transaction for reference in case of disputes.",

  // Financial Discipline
  "Financial discipline is built daily, not monthly. Small consistent choices matter most.",
  "Create financial rules for yourself and follow them without exception.",
  "Avoid financial comparisons with others. Your journey and goals are unique to you.",
  "Financial stress is reduced dramatically by having a plan, even a basic one.",
  "When income increases, increase savings before increasing lifestyle spending.",
  "Avoid impulsive financial decisions. Sleep on any major financial choice.",
  "Financial discipline is a skill. It improves with deliberate daily practice.",
  "Say no to social pressure that leads to unnecessary spending beyond your means.",
  "Keep a financial journal. Writing about money helps clarify your relationship with it.",
  "Identify your emotional spending triggers and build strategies to manage them.",
  "Surround yourself with people who talk about building wealth, not just spending it.",
  "Commit to a weekly financial check-in. Consistent attention creates lasting discipline.",

  // Long-term Money Habits
  "The habit of saving consistently for 10 years creates more wealth than a single large investment.",
  "Automate good financial habits. Remove willpower from the equation.",
  "Financial education is a lifelong practice. Read one finance book per quarter.",
  "The best time to start a good financial habit was yesterday. The second best is today.",
  "Build systems, not goals. A system for saving works even on bad days.",
  "Teach children about money early. Financial literacy is not taught in most schools.",
  "Track your net worth annually. A rising net worth confirms your habits are working.",
  "Avoid frequent lifestyle upgrades. Keeping costs low is more powerful than earning more.",
  "Think in decades when making long-term financial decisions.",
  "Your biggest financial asset is not your savings. It is your consistent earning ability.",
  "Do not borrow for depreciating assets unless absolutely necessary.",
  "The compound interest formula rewards patience more than intelligence.",

  // Budgeting (continued)
  "Use envelope budgeting for discretionary categories. When the envelope is empty, stop spending.",
  "Budget for gifts and celebrations annually. They are predictable and often overspent.",
  "Track your net income, not gross. Budget with what actually lands in your account.",
  "A family budget meeting once a month aligns everyone's spending with shared goals.",
  "Build a sinking fund for large irregular expenses like travel, appliances, or vehicle servicing.",
  "Reduce budget categories gradually. Drastic cuts are rarely sustainable long-term.",
  "If a budget category is consistently overspent, increase it slightly and reduce another.",
  "Budget for your hobbies. Removing all enjoyment from a budget makes it unsustainable.",
  "Review grocery spending. It is often the most improvable budget category.",
  "Annual budgeting helps you plan for quarterly and yearly expenses well in advance.",

  // Saving Habits (continued)
  "Reduce one expense this week and transfer the savings to your account immediately.",
  "The no-spend challenge for one weekend per month accelerates savings significantly.",
  "Build a car maintenance fund. Set aside a fixed amount monthly to avoid emergency costs.",
  "Save a percentage of every freelance or extra income earned outside your main salary.",
  "A travel fund saved monthly eliminates the need to borrow for holidays.",
  "Do not save what is left after spending. Spend what is left after saving.",
  "Savings accounts with a lock-in or notice period reduce the temptation to withdraw.",
  "Batch your online shopping to once a week. Reducing purchase frequency reduces spending.",
  "Challenge yourself to a month with no dining out. Put those savings aside.",
  "Loyalty points and cashback are savings. Redeem them instead of letting them expire.",

  // Investing Basics (continued)
  "Mutual funds spread your risk across many companies. No single stock can ruin your portfolio.",
  "Read the fund factsheet before investing. Understand the portfolio and expense ratio.",
  "A low expense ratio in a fund is a guaranteed return enhancement over time.",
  "Never put all your investments in a single sector, even a high-performing one.",
  "Gold allocations of 10 to 15% provide a hedge against currency and market risk.",
  "Debt mutual funds offer better post-tax returns than FDs for higher tax brackets.",
  "ELSS funds offer tax savings under Section 80C with the shortest lock-in of 3 years.",
  "Stock market investments require patience. Short-term volatility is normal and expected.",
  "Never take a loan to invest in equities. Leverage magnifies losses as well as gains.",
  "Start a SIP with whatever amount you can afford today. Increase it next year.",

  // Emergency Fund (continued)
  "Your emergency fund should be the first financial goal you fully complete.",
  "Top up your emergency fund whenever you spend from it before resuming other goals.",
  "A liquid mutual fund can serve as an emergency fund while still earning modest returns.",
  "Do not use a credit card as your emergency fund. It is debt, not a safety net.",
  "If you are self-employed or have variable income, keep 9 to 12 months of expenses saved.",
  "Your emergency fund should cover living expenses, not just rent and food.",
  "Review your emergency fund amount annually as your expenses change over time.",
  "Separate your emergency fund from your holiday fund. They serve very different purposes.",

  // Retirement Planning (continued)
  "Increase your retirement savings rate by 1% every time you receive a salary increment.",
  "The longer you wait to start saving for retirement, the more you will need to save each month.",
  "At 25, saving 15% of income for retirement is sufficient. At 35, it may need to be 25%.",
  "Target a retirement corpus that generates passive income exceeding your expenses.",
  "Plan for a retirement that may last 25 to 30 years. Longevity risk is real.",
  "A fee-only financial advisor charges you directly and has no product selling incentive.",

  // Credit Score Habits (continued)
  "Set up automatic minimum payment on your credit card to never miss a due date.",
  "Requesting a credit limit increase without using it improves your utilisation ratio.",
  "Avoid closing multiple credit cards at once. It can shorten your credit history sharply.",
  "A secured credit card helps build credit if you have no credit history.",
  "A co-applicant with a strong credit score can help you qualify for better loan terms.",

  // Tax Awareness (continued)
  "Tax deducted at source (TDS) can be recovered if your total income is below the taxable limit.",
  "Interest income from savings accounts up to ₹10,000 is exempt under Section 80TTA.",
  "Gifts above ₹50,000 from non-relatives are taxable. Know the rules before accepting.",
  "Carry forward your capital losses to offset capital gains in future years.",
  "Submitting Form 15G or 15H prevents TDS if you are below the tax-exempt income limit.",

  // Fraud Prevention (continued)
  "Shred bank statements and financial documents before disposal. Do not just throw them away.",
  "Register for transaction alerts by SMS and email for every account you hold.",
  "If you receive an unsolicited call about a prize or refund, hang up immediately.",
  "Secure your Aadhaar and PAN information. Misuse can cause serious financial harm.",
  "Report fraud to your bank within 3 days for full liability protection under RBI guidelines.",

  // Digital Payment Safety (continued)
  "Review the permissions of financial apps on your phone regularly and revoke unnecessary access.",
  "Do not store financial credentials in notes apps on your phone. Use a secure password manager.",
  "Enable device lock and biometric authentication on your smartphone as a basic security layer.",
  "Delete old payment apps you no longer use to reduce your exposure to security vulnerabilities.",

  // Smart Spending (continued)
  "Calculate cost-per-use before buying. A ₹5,000 item used 500 times costs ₹10 per use.",
  "Buy items in the off-season. Winter clothes are cheapest in summer.",
  "Repair before replacing. Many items can be fixed at a fraction of their replacement cost.",
  "Negotiate prices, especially for large purchases. Sellers often have flexibility.",
  "Group purchase needs rather than buying one item at a time to avoid repeated delivery charges.",
  "Free trials are free only if you remember to cancel them. Set a calendar reminder.",
  "A needs-only month once a year sharpens your awareness of unnecessary spending.",

  // Financial Discipline (continued)
  "Forgive financial mistakes and focus on correcting the behaviour going forward.",
  "A 1% improvement in a financial habit every month leads to massive change in a year.",
  "Track progress toward financial goals monthly. Seeing progress builds motivation.",
  "Make financial goals visible. Post them somewhere you see them daily.",
  "Do not compare your financial timeline to others. Progress at your own pace.",
  "Financial stress is often a signal that a plan is needed, not just more money.",
  "Speak to yourself positively about money. Negative beliefs about money limit financial action.",

  // Wealth Building (continued)
  "Every rupee saved in your twenties is worth over ₹10 by retirement at typical market returns.",
  "Side income invested consistently can match or exceed primary income over decades.",
  "Financial independence requires building assets that generate income without your active effort.",
  "Minimise financial friction. Automate transfers, payments, and investments wherever possible.",
  "Wealth is built during ordinary months, not during market rallies or salary hikes.",

  // Insurance Awareness (continued)
  "Increase your life insurance coverage as your income and dependents increase.",
  "Super top-up health insurance is a cost-effective way to increase your health cover significantly.",
  "Review your insurance nominees periodically, especially after marriage, divorce, or a bereavement.",
  "Do not buy insurance as a last-minute tax-saving move. Choose it based on actual need.",

  // Long-term Money Habits (continued)
  "A spending audit once a year identifies habits and patterns you cannot see month to month.",
  "Every financial goal starts with clarity. Write it down with a specific number and a date.",
  "Review all subscription services annually and cancel anything not used regularly.",
  "Your net worth statement is a scorecard. Update it every six months and track the trend.",
  "Simplify your finances. Fewer accounts and products are easier to manage and optimise.",
  "Teach yourself to find joy in saving and investing, not just in spending.",
  "Financial habits formed before 30 often determine financial outcomes after 50.",
  "Money is a tool. The goal is to use it in ways that align with your deepest values.",
  "Review your insurance, investments, and savings every January. Make it an annual ritual.",
  "Financial wellness and personal wellness are deeply connected. Manage both with equal care.",

  // Expense Tracking (continued)
  "Export your transaction history quarterly and look for patterns you have been missing.",
  "Tag recurring transactions so you can see exactly how much your fixed lifestyle costs each month.",
  "A weekly spending summary takes 5 minutes and saves you from budget surprises.",
  "Split joint expenses clearly in your tracker. Shared costs should never go unrecorded.",
  "Note the reason for discretionary purchases. Patterns reveal emotional spending triggers.",

  // Saving Habits (continued)
  "The first ₹1 lakh saved is the hardest. After that, compounding accelerates everything.",
  "A savings rate of 25% or more will make you financially independent faster than any investment return.",
  "Reduce utility bills by 10% through energy saving habits. That difference goes straight to savings.",
  "Before a purchase, ask yourself how many hours of work it cost. That perspective shifts decisions.",
  "Match every dining-out spend with an equal transfer to savings. It creates healthy friction.",
  "Saving consistently through a market crash builds the strongest long-term portfolios.",
  "Reinvest your annual pay increment into your savings rate before adjusting your lifestyle.",
  "Avoid saving in your current account. Idle money in a savings account at least earns interest.",
  "The two-account strategy — one for bills, one for spending — prevents accidental overspending.",
  "A yearly no-spend challenge for one category reveals how much you spend out of habit.",

  // Budgeting (continued)
  "The more specific your budget categories, the more accurately you can identify overspending.",
  "Allocate a personal allowance to each household member. It removes friction from family budgets.",
  "A spending freeze — no non-essential purchases for one week — resets impulsive spending habits.",
  "Budget reviews after each major life event: a promotion, a baby, a home purchase, a job loss.",
  "Shared expenses in a household should be split transparently with agreed contributions.",
  "Use historical data from your finance app to make next month's budget more accurate.",
  "A budget is a living document. Adjust it each month based on what the previous month taught you.",

  // Debt Management (continued)
  "If in debt, build only a ₹10,000 to ₹20,000 mini emergency fund first, then attack the debt.",
  "Refinancing a home loan at a lower interest rate can save lakhs over the loan tenure.",
  "Avoid EMIs for consumables. If you cannot buy it in cash, you cannot afford it right now.",
  "Loan prepayment reduces your interest burden significantly. Make part-payments when possible.",
  "Know the difference between productive debt — home loan, education — and destructive debt.",
  "Personal loans have high interest rates. Avoid them except in genuine emergencies.",
  "A co-signer for a loan is equally responsible for repayment. Never agree lightly.",
  "Paying off debt is a guaranteed, risk-free return equal to the loan's interest rate.",

  // Investing (continued)
  "Equity investments require at least a 5-year horizon to absorb market volatility comfortably.",
  "A balanced advantage fund adjusts automatically between equity and debt based on valuations.",
  "Systematic withdrawal plans (SWP) from mutual funds can create tax-efficient retirement income.",
  "Liquid funds offer better post-tax returns than savings accounts for amounts above ₹1 lakh.",
  "Always read the risk-o-meter on a mutual fund before investing. Match it to your risk tolerance.",
  "Flexi-cap funds give the fund manager freedom to invest across market caps as opportunities arise.",
  "Sovereign Gold Bonds offer a fixed interest rate plus gold price appreciation tax-efficiently.",
  "Real estate as an investment requires significant capital, illiquidity, and ongoing management.",
  "A balanced portfolio does not maximise returns. It maximises risk-adjusted wealth building.",

  // Financial Planning (continued)
  "A financial goal without a number and a date is just a wish.",
  "Calculate your human capital — your total future earnings potential — as your largest asset.",
  "Protect your income with disability insurance. Illness can interrupt earnings for months or years.",
  "A power of attorney for finances ensures someone can manage your money if you are incapacitated.",
  "Life stages require different financial focuses: career, family, peak earning, pre-retirement, retirement.",
  "Regularly update your beneficiary nominations on insurance policies and financial accounts.",

  // Smart Spending (continued)
  "Bulk buying saves money only when the product is used before it expires or degrades.",
  "Pre-commit to spending limits before entering a store or opening a shopping app.",
  "Borrow or rent rarely-used items instead of buying them. Libraries and rentals save significantly.",
  "Review your phone, internet, and streaming plans annually. Better deals are often available.",
  "Generic brands in most categories perform identically to premium brands. Test before assuming.",
  "A capsule wardrobe — fewer, higher-quality items — costs less over 5 years than fast fashion.",
  "Audit your food waste. Reducing it by half can lower your grocery bill noticeably.",

  // Wealth Building (continued)
  "A second income stream from a skill you already have is the fastest path to financial acceleration.",
  "Invest in depreciating assets only when they generate income that exceeds their cost.",
  "Financial independence is achieved when passive income exceeds your monthly living expenses.",
  "Avoid status spending. Wealth is built quietly, not displayed loudly.",
  "The most important financial decision is choosing a life partner with compatible money values.",
  "Every year of delay in starting wealth building costs you several years at the end of your plan.",

  // Insurance and Protection
  "Review your employer group health insurance. Know the limits and supplement with a personal plan.",
  "Home contents insurance covers theft and damage to belongings. Many homeowners overlook it.",
  "Life insurance is not for you. It is for the people who depend on your income.",

  // Tax Planning
  "Use your HUF (Hindu Undivided Family) account if applicable. It provides an additional ₹1.5 lakh deduction.",
  "Donate to registered NGOs under Section 80G and get a deduction on your taxable income.",
  "Agricultural income is tax-exempt in India but can still affect your tax slab for other income.",
  "Advance tax planning prevents a large outflow in March when multiple large payments converge.",

  // Miscellaneous Financial Wisdom
  "Set a monthly financial intention. One specific focus per month builds momentum over a year.",
  "A financial detox — reviewing and cutting unnecessary services — frees up surprising amounts.",
  "Never make a financial decision out of fear or greed. Both emotions lead to poor outcomes.",
  "Communicate clearly about money with family. Financial silence breeds costly misunderstandings.",
  "Your income is not wealth. Wealth is the portion of income converted into assets over time.",
  "Compound interest rewards the patient and penalises the impatient. Choose patience.",
  "Review your financial apps once a month. Unused apps may still have linked payment methods.",
  "Before upgrading anything — phone, car, home — calculate the true total cost of ownership.",
  "Clarity on your values makes spending decisions automatic. Spend on what matters, cut the rest.",
  "Small, consistent actions over years produce financial outcomes that look dramatic from outside.",
  "A financially healthy person is not someone who never makes mistakes. It is someone who learns from them.",
  "Give generously within your means. Generosity is part of a healthy relationship with money.",
  "Every financial skill you build today becomes a gift to your future self.",
  "Track your financial progress monthly, celebrate annually, and plan continuously.",
  "The foundation of all financial success is spending less than you earn, every single month.",
  "Be patient. Building genuine wealth almost always takes longer than expected and is worth it.",
  "Your financial story is not written yet. The decisions you make today determine the next chapter.",
]

function getDayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now - start
  return Math.floor(diff / 86400000)
}

export function getTodaysTip() {
  return DAILY_TIPS[getDayOfYear() % DAILY_TIPS.length]
}
