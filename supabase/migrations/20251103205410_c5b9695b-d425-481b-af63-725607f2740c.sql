-- Seed Prompt Library with briefing note templates

INSERT INTO prompts (name, description, prompt_text, category, tags, is_public, is_template, usage_count) VALUES
-- Executive Briefings
('Executive Policy Briefing', 'Template for executive-level policy briefings', '# EXECUTIVE POLICY BRIEFING

**Date:** {{date}}
**Subject:** {{subject}}
**Prepared by:** {{author}}
**Distribution:** {{distribution}}

## EXECUTIVE SUMMARY
[Provide 3-4 sentence overview of the key policy issue and recommendation]

## ISSUE OVERVIEW
**Background:**
- Context and history
- Current situation
- Key stakeholders

**Policy Problem:**
[Define the specific problem this policy addresses]

## ANALYSIS
**Current State:**
- Existing policies/practices
- Performance metrics
- Identified gaps

**Proposed Solution:**
- Policy recommendations
- Implementation approach
- Resource requirements

**Impact Assessment:**
- Stakeholder impact
- Financial implications
- Timeline considerations

## RISKS & MITIGATION
| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|-------------------|
| [Risk 1] | [H/M/L] | [H/M/L] | [Strategy] |

## RECOMMENDATIONS
1. [Primary recommendation]
2. [Secondary recommendation]
3. [Alternative options]

## NEXT STEPS
- [ ] Action item 1 (Owner, Date)
- [ ] Action item 2 (Owner, Date)
- [ ] Action item 3 (Owner, Date)

## APPENDICES
- Supporting data
- Legal considerations
- Stakeholder feedback', 'briefing', ARRAY['executive', 'policy', 'briefing'], true, true, 234),

('Strategic Initiative Briefing', 'Template for strategic business initiatives', '# STRATEGIC INITIATIVE BRIEFING

**Initiative Name:** {{initiative_name}}
**Date:** {{date}}
**Sponsor:** {{sponsor}}
**Status:** {{status}}

## STRATEGIC CONTEXT
**Business Objectives:**
- Alignment with corporate strategy
- Expected outcomes
- Success metrics

**Market Context:**
- Market trends
- Competitive landscape
- Customer needs

## INITIATIVE OVERVIEW
**Scope:**
[Define what is and is not included in this initiative]

**Objectives:**
1. [Primary objective with measurable target]
2. [Secondary objective with measurable target]
3. [Tertiary objective with measurable target]

**Key Deliverables:**
- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

## BUSINESS CASE
**Investment Required:**
- Capital expenditure: {{capex}}
- Operational expenditure: {{opex}}
- Resource allocation: {{resources}}

**Expected Returns:**
- Financial ROI: {{roi}}
- Timeline to breakeven: {{timeline}}
- Strategic value: {{strategic_value}}

**Cost-Benefit Analysis:**
[Quantitative and qualitative analysis of costs vs. benefits]

## IMPLEMENTATION PLAN
**Phase 1 - Planning:** {{phase1_dates}}
- Milestone 1
- Milestone 2

**Phase 2 - Execution:** {{phase2_dates}}
- Milestone 3
- Milestone 4

**Phase 3 - Optimization:** {{phase3_dates}}
- Milestone 5
- Milestone 6

## RISK ASSESSMENT
**High Priority Risks:**
1. [Risk description] - Mitigation: [Strategy]
2. [Risk description] - Mitigation: [Strategy]

**Dependencies:**
- [Critical dependency 1]
- [Critical dependency 2]

## GOVERNANCE
**Decision Rights:**
- Approval authority: {{approver}}
- Change control: {{change_process}}

**Reporting:**
- Frequency: {{reporting_frequency}}
- Key metrics: {{kpis}}

## RECOMMENDATION
[Clear, concise recommendation for leadership decision]', 'briefing', ARRAY['strategic', 'business', 'initiative'], true, true, 189),

-- Technical Briefings
('Technical Architecture Briefing', 'Template for technical architecture decisions', '# TECHNICAL ARCHITECTURE BRIEFING

**System/Project:** {{system_name}}
**Date:** {{date}}
**Architect:** {{architect}}
**Review Date:** {{review_date}}

## EXECUTIVE SUMMARY
[2-3 sentence summary of the architecture decision and rationale]

## BUSINESS CONTEXT
**Business Requirements:**
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Success Criteria:**
- [Criterion 1]
- [Criterion 2]

## CURRENT STATE
**Existing Architecture:**
[Description of current technical environment]

**Pain Points:**
1. [Pain point 1]
2. [Pain point 2]
3. [Pain point 3]

**Constraints:**
- Budget: {{budget}}
- Timeline: {{timeline}}
- Technical: {{technical_constraints}}

## PROPOSED ARCHITECTURE
**Overview:**
[High-level description of proposed architecture]

**Key Components:**
1. **{{component1}}** - [Description and rationale]
2. **{{component2}}** - [Description and rationale]
3. **{{component3}}** - [Description and rationale]

**Technology Stack:**
- Frontend: {{frontend_tech}}
- Backend: {{backend_tech}}
- Database: {{database_tech}}
- Infrastructure: {{infrastructure}}

## ARCHITECTURE DECISIONS
| Decision | Options Considered | Selected Option | Rationale |
|----------|-------------------|-----------------|-----------|
| [Decision 1] | [Options] | [Selection] | [Why] |
| [Decision 2] | [Options] | [Selection] | [Why] |

## NON-FUNCTIONAL REQUIREMENTS
**Performance:**
- Response time: {{response_time}}
- Throughput: {{throughput}}
- Concurrency: {{concurrency}}

**Scalability:**
- Growth projections: {{growth}}
- Scaling strategy: {{scaling_strategy}}

**Security:**
- Authentication: {{auth_method}}
- Authorization: {{authz_method}}
- Data protection: {{data_protection}}

**Reliability:**
- Availability target: {{availability}}
- Recovery time objective: {{rto}}
- Recovery point objective: {{rpo}}

## IMPLEMENTATION
**Phases:**
1. **Phase 1:** [Description] - {{phase1_timeline}}
2. **Phase 2:** [Description] - {{phase2_timeline}}
3. **Phase 3:** [Description] - {{phase3_timeline}}

**Resource Requirements:**
- Development team: {{dev_resources}}
- Infrastructure: {{infra_resources}}
- Third-party services: {{third_party}}

## RISKS & DEPENDENCIES
**Technical Risks:**
1. [Risk] - Mitigation: [Strategy]
2. [Risk] - Mitigation: [Strategy]

**Dependencies:**
- [Dependency 1]
- [Dependency 2]

## RECOMMENDATION
[Clear technical recommendation with supporting rationale]

## APPENDICES
- Architecture diagrams
- Proof of concept results
- Vendor evaluations', 'briefing', ARRAY['technical', 'architecture', 'engineering'], true, true, 167),

('Security Assessment Briefing', 'Template for security assessment reports', '# SECURITY ASSESSMENT BRIEFING

**Assessment Date:** {{date}}
**System/Application:** {{system}}
**Assessor:** {{assessor}}
**Classification:** {{classification}}

## EXECUTIVE SUMMARY
**Overall Risk Rating:** {{overall_risk}}

**Key Findings:**
- [Critical finding 1]
- [Critical finding 2]
- [Critical finding 3]

**Immediate Actions Required:** {{immediate_actions}}

## SCOPE
**Assessment Scope:**
- Components assessed: {{components}}
- Assessment methods: {{methods}}
- Time period: {{timeframe}}

**Out of Scope:**
- [Exclusion 1]
- [Exclusion 2]

## FINDINGS
### Critical Vulnerabilities
1. **{{vuln1_title}}**
   - Severity: CRITICAL
   - CVSS Score: {{cvss1}}
   - Impact: [Description]
   - Remediation: [Action required]
   - Timeline: [Deadline]

### High Priority Issues
2. **{{issue1_title}}**
   - Severity: HIGH
   - Impact: [Description]
   - Remediation: [Action required]
   - Timeline: [Deadline]

### Medium Priority Issues
[List of medium priority items]

### Low Priority Issues
[List of low priority items]

## COMPLIANCE STATUS
**Regulatory Requirements:**
- GDPR: {{gdpr_status}}
- SOC 2: {{soc2_status}}
- ISO 27001: {{iso_status}}

**Gaps Identified:**
1. [Gap description] - Action: [Required action]
2. [Gap description] - Action: [Required action]

## RISK ASSESSMENT
| Vulnerability | Likelihood | Impact | Risk Score | Priority |
|--------------|-----------|--------|-----------|----------|
| [Vuln 1] | [H/M/L] | [H/M/L] | [Score] | [P1-P4] |

## REMEDIATION PLAN
**Phase 1 - Immediate (0-30 days):**
- [ ] [Action 1] - Owner: {{owner1}}
- [ ] [Action 2] - Owner: {{owner2}}

**Phase 2 - Short-term (1-3 months):**
- [ ] [Action 3] - Owner: {{owner3}}
- [ ] [Action 4] - Owner: {{owner4}}

**Phase 3 - Long-term (3-6 months):**
- [ ] [Action 5] - Owner: {{owner5}}

## RESOURCE REQUIREMENTS
**Team:**
- Security team: {{security_hours}} hours
- Development team: {{dev_hours}} hours
- Infrastructure team: {{infra_hours}} hours

**Budget:**
- Tools/licenses: {{tools_budget}}
- Services: {{services_budget}}
- Total: {{total_budget}}

## RECOMMENDATIONS
1. [Priority recommendation]
2. [Secondary recommendation]
3. [Long-term recommendation]

## NEXT REVIEW
- Follow-up assessment: {{followup_date}}
- Interim reviews: {{interim_schedule}}', 'briefing', ARRAY['security', 'technical', 'compliance'], true, true, 145),

-- Financial Briefings
('Financial Performance Briefing', 'Template for financial performance reports', '# FINANCIAL PERFORMANCE BRIEFING

**Period:** {{period}}
**Date Prepared:** {{date}}
**Prepared by:** {{preparer}}
**Distribution:** {{distribution}}

## EXECUTIVE SUMMARY
**Key Highlights:**
- Revenue: {{revenue}} ({{revenue_variance}}% vs. plan)
- EBITDA: {{ebitda}} ({{ebitda_margin}}% margin)
- Net Income: {{net_income}}
- Cash Position: {{cash_position}}

**Summary Commentary:**
[2-3 sentences on overall financial health and key drivers]

## FINANCIAL HIGHLIGHTS
**Year-to-Date Performance:**
| Metric | Actual | Plan | Variance | Prior Year |
|--------|--------|------|----------|-----------|
| Revenue | {{ytd_revenue}} | {{ytd_plan}} | {{ytd_var}} | {{py_revenue}} |
| Gross Profit | {{ytd_gp}} | {{ytd_gp_plan}} | {{ytd_gp_var}} | {{py_gp}} |
| Operating Expenses | {{ytd_opex}} | {{ytd_opex_plan}} | {{ytd_opex_var}} | {{py_opex}} |
| EBITDA | {{ytd_ebitda}} | {{ytd_ebitda_plan}} | {{ytd_ebitda_var}} | {{py_ebitda}} |

## REVENUE ANALYSIS
**Revenue by Segment:**
- {{segment1}}: {{seg1_revenue}} ({{seg1_growth}}% growth)
- {{segment2}}: {{seg2_revenue}} ({{seg2_growth}}% growth)
- {{segment3}}: {{seg3_revenue}} ({{seg3_growth}}% growth)

**Key Drivers:**
✓ [Positive driver 1]
✓ [Positive driver 2]
⚠ [Challenge/risk 1]
⚠ [Challenge/risk 2]

## PROFITABILITY ANALYSIS
**Margin Analysis:**
- Gross Margin: {{gm}}% ({{gm_variance}}% vs. plan)
- Operating Margin: {{om}}% ({{om_variance}}% vs. plan)
- Net Margin: {{nm}}% ({{nm_variance}}% vs. plan)

**Cost Structure:**
[Analysis of major cost categories and trends]

## CASH FLOW
**Operating Cash Flow:** {{ocf}}
**Investing Activities:** {{investing}}
**Financing Activities:** {{financing}}
**Net Change in Cash:** {{net_cash_change}}

**Working Capital:**
- Days Sales Outstanding: {{dso}} days
- Days Inventory Outstanding: {{dio}} days
- Days Payable Outstanding: {{dpo}} days
- Cash Conversion Cycle: {{ccc}} days

## BALANCE SHEET HIGHLIGHTS
**Assets:** {{total_assets}}
- Current Assets: {{current_assets}}
- Fixed Assets: {{fixed_assets}}

**Liabilities:** {{total_liabilities}}
- Current Liabilities: {{current_liabilities}}
- Long-term Debt: {{long_term_debt}}

**Equity:** {{equity}}

**Key Ratios:**
- Current Ratio: {{current_ratio}}
- Debt-to-Equity: {{debt_equity}}
- Return on Equity: {{roe}}%

## FORECAST
**Updated Forecast:**
- Revenue: {{fcst_revenue}} ({{fcst_rev_change}} vs. prior forecast)
- EBITDA: {{fcst_ebitda}} ({{fcst_ebitda_margin}}% margin)
- Net Income: {{fcst_ni}}

**Key Assumptions:**
1. [Assumption 1]
2. [Assumption 2]
3. [Assumption 3]

**Risks to Forecast:**
- [Risk 1]: {{risk1_impact}}
- [Risk 2]: {{risk2_impact}}

## RECOMMENDATIONS
1. [Financial recommendation 1]
2. [Financial recommendation 2]
3. [Financial recommendation 3]

## APPENDICES
- Detailed financial statements
- Variance analysis by cost center
- Cash flow projections', 'briefing', ARRAY['financial', 'business', 'analysis'], true, true, 198),

('Investment Decision Briefing', 'Template for investment proposals', '# INVESTMENT DECISION BRIEFING

**Investment Opportunity:** {{opportunity_name}}
**Date:** {{date}}
**Sponsor:** {{sponsor}}
**Decision Required By:** {{decision_date}}

## EXECUTIVE SUMMARY
**Investment Request:** {{investment_amount}}
**Expected Return:** {{expected_return}}
**Payback Period:** {{payback}}
**Recommendation:** {{recommendation}}

[2-3 sentence summary of opportunity and recommendation]

## OPPORTUNITY OVERVIEW
**Background:**
[Context and rationale for this investment]

**Strategic Alignment:**
- Corporate objective: {{objective}}
- Strategic priority: {{priority}}
- Market opportunity: {{market_opp}}

## BUSINESS CASE
**Market Analysis:**
- Market size: {{market_size}}
- Growth rate: {{growth_rate}}
- Market share potential: {{market_share}}

**Competitive Position:**
- Current position: {{current_position}}
- Target position: {{target_position}}
- Competitive advantages: {{advantages}}

## FINANCIAL ANALYSIS
**Investment Required:**
- Capital expenditure: {{capex}}
- Operating expenditure (Year 1): {{opex_y1}}
- Working capital: {{working_capital}}
- **Total Investment:** {{total_investment}}

**Revenue Projections:**
| Year | Revenue | Growth | Margin |
|------|---------|--------|--------|
| Year 1 | {{y1_rev}} | {{y1_growth}} | {{y1_margin}} |
| Year 2 | {{y2_rev}} | {{y2_growth}} | {{y2_margin}} |
| Year 3 | {{y3_rev}} | {{y3_growth}} | {{y3_margin}} |
| Year 4 | {{y4_rev}} | {{y4_growth}} | {{y4_margin}} |
| Year 5 | {{y5_rev}} | {{y5_growth}} | {{y5_margin}} |

**Return Metrics:**
- Net Present Value: {{npv}}
- Internal Rate of Return: {{irr}}%
- Payback Period: {{payback_period}}
- Return on Investment: {{roi}}%

**Sensitivity Analysis:**
| Scenario | Assumptions | NPV | IRR |
|----------|------------|-----|-----|
| Base Case | [Assumptions] | {{base_npv}} | {{base_irr}} |
| Optimistic | [Assumptions] | {{opt_npv}} | {{opt_irr}} |
| Pessimistic | [Assumptions] | {{pes_npv}} | {{pes_irr}} |

## IMPLEMENTATION PLAN
**Timeline:**
- Approval: {{approval_date}}
- Planning: {{planning_dates}}
- Implementation: {{impl_dates}}
- Launch: {{launch_date}}

**Key Milestones:**
1. [Milestone 1] - {{m1_date}}
2. [Milestone 2] - {{m2_date}}
3. [Milestone 3] - {{m3_date}}

**Resource Requirements:**
- Team: {{team_size}} FTEs
- Key hires: {{key_hires}}
- External support: {{external_support}}

## RISK ASSESSMENT
**Key Risks:**
1. **{{risk1}}**
   - Probability: {{risk1_prob}}
   - Impact: {{risk1_impact}}
   - Mitigation: [Strategy]

2. **{{risk2}}**
   - Probability: {{risk2_prob}}
   - Impact: {{risk2_impact}}
   - Mitigation: [Strategy]

**Risk-Adjusted Returns:**
- Risk-adjusted NPV: {{ra_npv}}
- Confidence level: {{confidence}}%

## ALTERNATIVES CONSIDERED
**Option 1: {{alt1_name}}**
- Investment: {{alt1_investment}}
- NPV: {{alt1_npv}}
- Pros/Cons: [Summary]

**Option 2: {{alt2_name}}**
- Investment: {{alt2_investment}}
- NPV: {{alt2_npv}}
- Pros/Cons: [Summary]

## RECOMMENDATION
**Primary Recommendation:**
[Clear recommendation with supporting rationale]

**Conditions:**
- [Condition 1]
- [Condition 2]

**Next Steps:**
1. [Action 1] - Owner: {{owner1}}
2. [Action 2] - Owner: {{owner2}}

## APPENDICES
- Detailed financial model
- Market research data
- Competitive analysis
- Risk register', 'briefing', ARRAY['financial', 'investment', 'business'], true, true, 176),

-- Marketing Briefings
('Marketing Campaign Briefing', 'Template for marketing campaign plans', '# MARKETING CAMPAIGN BRIEFING

**Campaign Name:** {{campaign_name}}
**Date:** {{date}}
**Campaign Manager:** {{manager}}
**Budget:** {{budget}}

## CAMPAIGN OVERVIEW
**Objective:**
[Primary goal of this campaign]

**Target Audience:**
- Demographics: {{demographics}}
- Psychographics: {{psychographics}}
- Behaviors: {{behaviors}}

**Key Message:**
[Core message/value proposition]

## SITUATION ANALYSIS
**Market Context:**
- Market size: {{market_size}}
- Trends: {{trends}}
- Competitive activity: {{competition}}

**SWOT Analysis:**
- Strengths: [List]
- Weaknesses: [List]
- Opportunities: [List]
- Threats: [List]

## CAMPAIGN STRATEGY
**Campaign Goals:**
1. {{goal1}} - Target: {{target1}}
2. {{goal2}} - Target: {{target2}}
3. {{goal3}} - Target: {{target3}}

**Key Performance Indicators:**
| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| {{kpi1}} | {{target1}} | {{method1}} |
| {{kpi2}} | {{target2}} | {{method2}} |
| {{kpi3}} | {{target3}} | {{method3}} |

**Creative Concept:**
[Description of creative approach and key visual/messaging themes]

## CHANNEL STRATEGY
**Channel Mix:**
1. **{{channel1}}** - Budget: {{ch1_budget}} ({{ch1_pct}}%)
   - Tactics: [Specific tactics]
   - Rationale: [Why this channel]

2. **{{channel2}}** - Budget: {{ch2_budget}} ({{ch2_pct}}%)
   - Tactics: [Specific tactics]
   - Rationale: [Why this channel]

3. **{{channel3}}** - Budget: {{ch3_budget}} ({{ch3_pct}}%)
   - Tactics: [Specific tactics]
   - Rationale: [Why this channel]

## CAMPAIGN TIMELINE
**Pre-Launch ({{prelaunch_dates}}):**
- [ ] Creative development
- [ ] Asset production
- [ ] Channel setup
- [ ] Testing

**Launch Phase ({{launch_dates}}):**
- [ ] Campaign activation
- [ ] Monitoring setup
- [ ] Initial optimization

**Active Phase ({{active_dates}}):**
- [ ] Ongoing optimization
- [ ] Performance monitoring
- [ ] Reporting

**Post-Campaign ({{post_dates}}):**
- [ ] Analysis
- [ ] Reporting
- [ ] Learnings documentation

## BUDGET ALLOCATION
| Category | Amount | Percentage |
|----------|--------|-----------|
| Media | {{media_budget}} | {{media_pct}}% |
| Creative | {{creative_budget}} | {{creative_pct}}% |
| Technology | {{tech_budget}} | {{tech_pct}}% |
| Agency Fees | {{agency_budget}} | {{agency_pct}}% |
| Contingency | {{contingency}} | {{contingency_pct}}% |
| **Total** | **{{total_budget}}** | **100%** |

## CREATIVE REQUIREMENTS
**Assets Needed:**
- [Asset type 1]: {{asset1_specs}}
- [Asset type 2]: {{asset2_specs}}
- [Asset type 3]: {{asset3_specs}}

**Messaging:**
- Headline: {{headline}}
- Subheadline: {{subheadline}}
- Call-to-action: {{cta}}
- Value propositions: [List]

## MEASUREMENT PLAN
**Success Metrics:**
- Reach: {{reach_target}}
- Engagement: {{engagement_target}}
- Conversions: {{conversion_target}}
- ROI: {{roi_target}}

**Reporting Cadence:**
- Daily: [Metrics]
- Weekly: [Metrics]
- Monthly: [Metrics]
- Campaign end: [Full analysis]

## RISKS & MITIGATION
| Risk | Impact | Mitigation |
|------|--------|-----------|
| {{risk1}} | {{impact1}} | {{mitigation1}} |
| {{risk2}} | {{impact2}} | {{mitigation2}} |

## TEAM & RESPONSIBILITIES
- Campaign Manager: {{manager}}
- Creative Lead: {{creative_lead}}
- Media Lead: {{media_lead}}
- Analytics Lead: {{analytics_lead}}

## APPENDICES
- Creative mockups
- Media plan details
- Budget breakdown
- Audience research', 'briefing', ARRAY['marketing', 'campaign', 'strategy'], true, true, 211),

-- HR & People Briefings
('Organizational Change Briefing', 'Template for organizational change initiatives', '# ORGANIZATIONAL CHANGE BRIEFING

**Change Initiative:** {{initiative_name}}
**Date:** {{date}}
**Change Sponsor:** {{sponsor}}
**Change Manager:** {{manager}}

## EXECUTIVE SUMMARY
**Change Overview:**
[2-3 sentence description of the change and its purpose]

**Scope:** {{scope}}
**Timeline:** {{timeline}}
**Impact:** {{people_impacted}} employees affected

## CASE FOR CHANGE
**Business Drivers:**
1. [Driver 1]
2. [Driver 2]
3. [Driver 3]

**Current State Challenges:**
- [Challenge 1]
- [Challenge 2]
- [Challenge 3]

**Future State Vision:**
[Description of desired end state]

## STAKEHOLDER ANALYSIS
**Primary Stakeholders:**
| Stakeholder Group | Impact Level | Support Level | Engagement Strategy |
|------------------|-------------|--------------|-------------------|
| {{group1}} | {{impact1}} | {{support1}} | {{strategy1}} |
| {{group2}} | {{impact2}} | {{support2}} | {{strategy2}} |

**Key Influencers:**
- [Influencer 1]: {{influence1_strategy}}
- [Influencer 2]: {{influence2_strategy}}

## IMPACT ASSESSMENT
**People Impact:**
- Roles affected: {{roles_affected}}
- New skills required: {{skills_required}}
- Training needs: {{training_needs}}

**Process Impact:**
- Processes changed: {{processes_changed}}
- New processes: {{new_processes}}
- Process improvements: {{improvements}}

**Technology Impact:**
- Systems affected: {{systems}}
- New tools: {{new_tools}}
- Integration requirements: {{integration}}

## CHANGE ROADMAP
**Phase 1 - Prepare ({{phase1_dates}}):**
- [ ] Change vision and strategy
- [ ] Stakeholder analysis
- [ ] Change team formation
- [ ] Communication plan

**Phase 2 - Plan ({{phase2_dates}}):**
- [ ] Detailed implementation plan
- [ ] Training program development
- [ ] Risk mitigation strategies
- [ ] Success metrics definition

**Phase 3 - Implement ({{phase3_dates}}):**
- [ ] Change execution
- [ ] Training delivery
- [ ] Support structure activation
- [ ] Progress monitoring

**Phase 4 - Sustain ({{phase4_dates}}):**
- [ ] Reinforcement activities
- [ ] Performance monitoring
- [ ] Continuous improvement
- [ ] Change closure

## COMMUNICATION PLAN
**Key Messages:**
1. Why we''re changing: [Message]
2. What''s changing: [Message]
3. How it affects you: [Message]
4. When it''s happening: [Message]
5. Support available: [Message]

**Communication Channels:**
- All-hands meetings: {{allhands_schedule}}
- Email updates: {{email_schedule}}
- Town halls: {{townhall_schedule}}
- Manager cascades: {{cascade_schedule}}

## TRAINING STRATEGY
**Training Programs:**
1. **{{training1}}**
   - Audience: {{audience1}}
   - Duration: {{duration1}}
   - Delivery: {{delivery1}}

2. **{{training2}}**
   - Audience: {{audience2}}
   - Duration: {{duration2}}
   - Delivery: {{delivery2}}

**Support Resources:**
- Help desk: {{helpdesk}}
- Champions network: {{champions}}
- Documentation: {{docs}}

## RESISTANCE MANAGEMENT
**Anticipated Resistance:**
| Source | Reason | Mitigation Strategy |
|--------|--------|-------------------|
| {{source1}} | {{reason1}} | {{mitigation1}} |
| {{source2}} | {{reason2}} | {{mitigation2}} |

## SUCCESS MEASURES
**Leading Indicators:**
- Engagement in training: {{training_target}}%
- Communication reach: {{comm_target}}%
- Early adopters: {{adopter_target}}%

**Lagging Indicators:**
- Adoption rate: {{adoption_target}}%
- Performance improvement: {{perf_target}}%
- Employee satisfaction: {{satisfaction_target}}

## GOVERNANCE
**Change Board:**
- Members: {{board_members}}
- Meeting cadence: {{meeting_frequency}}
- Decision authority: {{decision_process}}

**Reporting:**
- Status updates: {{status_frequency}}
- Metrics dashboard: {{dashboard_location}}

## RISKS & DEPENDENCIES
**Key Risks:**
1. [Risk] - Mitigation: [Strategy]
2. [Risk] - Mitigation: [Strategy]

**Critical Dependencies:**
- [Dependency 1]
- [Dependency 2]

## RESOURCE REQUIREMENTS
**Team:**
- Change managers: {{change_mgrs}}
- Communications: {{comms_resource}}
- Training: {{training_resource}}
- IT support: {{it_resource}}

**Budget:**
- Training: {{training_budget}}
- Communications: {{comms_budget}}
- Tools/technology: {{tech_budget}}
- Contingency: {{contingency}}
- **Total:** {{total_budget}}

## NEXT STEPS
1. [Action 1] - Owner: {{owner1}} - Due: {{due1}}
2. [Action 2] - Owner: {{owner2}} - Due: {{due2}}
3. [Action 3] - Owner: {{owner3}} - Due: {{due3}}', 'briefing', ARRAY['hr', 'change', 'organizational'], true, true, 142),

('Talent Acquisition Briefing', 'Template for recruitment and hiring strategies', '# TALENT ACQUISITION BRIEFING

**Position:** {{position_title}}
**Department:** {{department}}
**Date:** {{date}}
**Hiring Manager:** {{hiring_manager}}
**Recruiter:** {{recruiter}}

## POSITION OVERVIEW
**Role Summary:**
[2-3 sentence description of the role and its purpose]

**Reports To:** {{reports_to}}
**Team Size:** {{team_size}}
**Location:** {{location}}
**Employment Type:** {{employment_type}}

## BUSINESS CONTEXT
**Why We''re Hiring:**
- [Reason 1: growth, replacement, new initiative, etc.]
- [Business impact of this role]

**Strategic Importance:**
[How this role supports business objectives]

## ROLE REQUIREMENTS
**Essential Responsibilities:**
1. [Key responsibility 1]
2. [Key responsibility 2]
3. [Key responsibility 3]
4. [Key responsibility 4]
5. [Key responsibility 5]

**Required Qualifications:**
- Education: {{education_req}}
- Experience: {{experience_req}}
- Technical skills: {{technical_skills}}
- Certifications: {{certifications}}

**Preferred Qualifications:**
- [Preferred qualification 1]
- [Preferred qualification 2]
- [Preferred qualification 3]

**Key Competencies:**
- [Competency 1]: [Why it matters]
- [Competency 2]: [Why it matters]
- [Competency 3]: [Why it matters]

## IDEAL CANDIDATE PROFILE
**Background:**
[Description of ideal experience and background]

**Success Factors:**
- 30 days: [What success looks like]
- 90 days: [What success looks like]
- 180 days: [What success looks like]

**Cultural Fit:**
- Values alignment: [Key values]
- Work style: [Preferred work style]
- Team dynamics: [Team characteristics]

## COMPENSATION & BENEFITS
**Compensation Range:** {{comp_range}}
- Base salary: {{base_range}}
- Bonus/commission: {{bonus_structure}}
- Equity: {{equity}}

**Benefits Package:**
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

**Total Compensation:** {{total_comp_range}}

## SOURCING STRATEGY
**Target Markets:**
- Primary: {{primary_market}}
- Secondary: {{secondary_market}}

**Sourcing Channels:**
1. **{{channel1}}** - Priority: {{priority1}}
   - Tactics: [Specific approach]

2. **{{channel2}}** - Priority: {{priority2}}
   - Tactics: [Specific approach]

3. **{{channel3}}** - Priority: {{priority3}}
   - Tactics: [Specific approach]

**Passive Candidate Strategy:**
[Approach for engaging passive candidates]

## SELECTION PROCESS
**Screening:**
- Resume review criteria: [Criteria]
- Phone screen: {{screen_duration}} min
- Key questions: [Questions]

**Interview Process:**
1. **{{interview1}}** ({{duration1}})
   - Interviewer: {{interviewer1}}
   - Focus: {{focus1}}

2. **{{interview2}}** ({{duration2}})
   - Interviewer: {{interviewer2}}
   - Focus: {{focus2}}

3. **{{interview3}}** ({{duration3}})
   - Interviewer: {{interviewer3}}
   - Focus: {{focus3}}

**Assessment:**
- Assessment type: {{assessment_type}}
- Evaluation criteria: [Criteria]

**Reference Checks:**
- Number of references: {{ref_count}}
- Focus areas: [Areas]

## TIMELINE
**Target Dates:**
- Job posting: {{posting_date}}
- Application deadline: {{app_deadline}}
- Initial interviews: {{initial_interviews}}
- Final interviews: {{final_interviews}}
- Offer date: {{offer_date}}
- Start date: {{start_date}}

**Total Time to Hire:** {{time_to_hire}} days

## COMPETITIVE INTELLIGENCE
**Market Insights:**
- Talent availability: {{talent_availability}}
- Competitive landscape: {{competition}}
- Salary benchmarks: {{salary_benchmarks}}

**Challenges:**
- [Challenge 1]
- [Challenge 2]

## EMPLOYER VALUE PROPOSITION
**Why Join Us:**
1. [Compelling reason 1]
2. [Compelling reason 2]
3. [Compelling reason 3]

**Career Development:**
- Growth opportunities: [Opportunities]
- Development programs: [Programs]

## SUCCESS METRICS
**Recruiting KPIs:**
- Time to fill: {{target_time}} days
- Quality of hire: {{quality_target}}
- Offer acceptance rate: {{acceptance_target}}%
- Hiring manager satisfaction: {{satisfaction_target}}

## RISKS & MITIGATION
| Risk | Mitigation Strategy |
|------|-------------------|
| {{risk1}} | {{mitigation1}} |
| {{risk2}} | {{mitigation2}} |

## NEXT STEPS
- [ ] Job description approval - {{approval_date}}
- [ ] Posting creation - {{posting_date}}
- [ ] Sourcing launch - {{sourcing_date}}
- [ ] Interview team briefing - {{briefing_date}}', 'briefing', ARRAY['hr', 'recruitment', 'talent'], true, true, 163),

-- Project Management Briefings
('Project Status Briefing', 'Template for project status updates', '# PROJECT STATUS BRIEFING

**Project:** {{project_name}}
**Period:** {{period}}
**Date:** {{date}}
**Project Manager:** {{pm_name}}
**Status:** {{status}}

## EXECUTIVE SUMMARY
**Overall Health:** {{overall_status}}
- Schedule: {{schedule_status}}
- Budget: {{budget_status}}
- Scope: {{scope_status}}
- Quality: {{quality_status}}

**Key Highlights:**
✓ [Achievement 1]
✓ [Achievement 2]
⚠ [Challenge 1]
⚠ [Challenge 2]

## PROJECT OVERVIEW
**Objective:**
[Project goal and purpose]

**Current Phase:** {{current_phase}}
**Completion:** {{completion_pct}}%

## PROGRESS SUMMARY
**Completed This Period:**
- [Milestone 1] - {{m1_completion_date}}
- [Milestone 2] - {{m2_completion_date}}
- [Deliverable 1]
- [Deliverable 2]

**In Progress:**
- [Activity 1] - {{activity1_progress}}% complete
- [Activity 2] - {{activity2_progress}}% complete
- [Activity 3] - {{activity3_progress}}% complete

**Planned Next Period:**
- [Planned activity 1]
- [Planned activity 2]
- [Planned milestone]

## SCHEDULE STATUS
**Key Milestones:**
| Milestone | Planned Date | Forecast Date | Status |
|-----------|-------------|--------------|--------|
| {{milestone1}} | {{m1_plan}} | {{m1_forecast}} | {{m1_status}} |
| {{milestone2}} | {{m2_plan}} | {{m2_forecast}} | {{m2_status}} |
| {{milestone3}} | {{m3_plan}} | {{m3_forecast}} | {{m3_status}} |

**Schedule Variance:** {{schedule_variance}} days
**Forecast Completion:** {{forecast_date}}
**Baseline Completion:** {{baseline_date}}

**Schedule Risks:**
- [Risk 1]: Impact: {{risk1_impact}}
- [Risk 2]: Impact: {{risk2_impact}}

## BUDGET STATUS
**Budget Summary:**
- Approved Budget: {{approved_budget}}
- Spent to Date: {{spent}} ({{spent_pct}}%)
- Committed: {{committed}}
- Remaining: {{remaining}}
- Forecast at Completion: {{forecast_budget}}
- Variance: {{budget_variance}}

**Cost Breakdown:**
| Category | Budget | Actual | Remaining | Variance |
|----------|--------|--------|-----------|----------|
| {{cat1}} | {{cat1_budget}} | {{cat1_actual}} | {{cat1_remaining}} | {{cat1_var}} |
| {{cat2}} | {{cat2_budget}} | {{cat2_actual}} | {{cat2_remaining}} | {{cat2_var}} |

**Budget Concerns:**
- [Concern 1]: [Mitigation]
- [Concern 2]: [Mitigation]

## SCOPE STATUS
**Scope Changes This Period:**
- [Change 1]: Impact: {{change1_impact}}
- [Change 2]: Impact: {{change2_impact}}

**Pending Changes:**
- [Pending change 1]: Decision needed by {{decision1_date}}

**Scope Creep Risk:** {{creep_risk}}

## QUALITY & DELIVERABLES
**Quality Metrics:**
- Defect rate: {{defect_rate}}
- Rework percentage: {{rework_pct}}%
- Acceptance rate: {{acceptance_rate}}%

**Deliverables Status:**
- Delivered: {{delivered_count}}
- In review: {{review_count}}
- In progress: {{progress_count}}

**Quality Issues:**
- [Issue 1]: [Action]
- [Issue 2]: [Action]

## RISKS & ISSUES
**Top Risks:**
1. **{{risk1}}**
   - Probability: {{risk1_prob}}
   - Impact: {{risk1_impact}}
   - Mitigation: [Strategy]
   - Owner: {{risk1_owner}}

2. **{{risk2}}**
   - Probability: {{risk2_prob}}
   - Impact: {{risk2_impact}}
   - Mitigation: [Strategy]
   - Owner: {{risk2_owner}}

**Active Issues:**
1. **{{issue1}}**
   - Priority: {{issue1_priority}}
   - Action: [Resolution plan]
   - Owner: {{issue1_owner}}
   - Target date: {{issue1_date}}

## DEPENDENCIES
**External Dependencies:**
- [Dependency 1]: Status: {{dep1_status}}
- [Dependency 2]: Status: {{dep2_status}}

**Blocking Issues:**
- [Blocker 1]: [Impact and resolution plan]

## RESOURCE STATUS
**Team Utilization:**
- Current team size: {{team_size}}
- Utilization rate: {{utilization}}%
- Upcoming needs: {{upcoming_needs}}

**Resource Concerns:**
- [Concern 1]
- [Concern 2]

## STAKEHOLDER ENGAGEMENT
**Recent Stakeholder Activities:**
- [Activity 1]
- [Activity 2]

**Upcoming Engagement:**
- [Planned activity 1] - {{activity1_date}}
- [Planned activity 2] - {{activity2_date}}

## DECISIONS NEEDED
1. **{{decision1}}**
   - Required by: {{decision1_date}}
   - Decision maker: {{decision1_maker}}
   - Options: [Options]

2. **{{decision2}}**
   - Required by: {{decision2_date}}
   - Decision maker: {{decision2_maker}}
   - Options: [Options]

## NEXT PERIOD FOCUS
**Priorities:**
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

**Key Activities:**
- [Activity 1]
- [Activity 2]
- [Activity 3]

## APPENDICES
- Detailed schedule
- Budget breakdown
- Risk register
- Change log', 'briefing', ARRAY['project', 'status', 'management'], true, true, 187);