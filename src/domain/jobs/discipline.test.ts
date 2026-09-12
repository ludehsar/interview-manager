import { describe, expect, it } from 'vitest'
import { classifyDiscipline } from './discipline'

describe('classifyDiscipline', () => {
  it('keeps software roles', () => {
    const titles = [
      'Senior Software Engineer',
      'Staff Backend Engineer, Payments',
      'Full Stack Developer',
      'Sr. Frontend Engineer (React)',
      'Android Developer',
      'SDET II',
      'Site Reliability Engineer',
      'DevOps Engineer',
      'QA Automation Engineer',
      'Engineering Manager, Platform',
      'Technical Lead - Laravel',
      'Engineering Team Lead',
      'Solutions Architect',
      'Programmer',
      'Executive, Software Engineer',
    ]
    for (const title of titles) {
      expect([title, classifyDiscipline(title)]).toEqual([title, 'SOFTWARE'])
    }
  })

  it('keeps the adjacent technical disciplines', () => {
    expect(classifyDiscipline('Machine Learning Engineer')).toBe('DATA')
    expect(classifyDiscipline('Data Scientist')).toBe('DATA')
    expect(classifyDiscipline('Business Intelligence Analyst')).toBe('DATA')
    expect(classifyDiscipline('Senior Product Manager')).toBe('PRODUCT')
    expect(classifyDiscipline('Technical Project Manager')).toBe('PRODUCT')
    expect(classifyDiscipline('Scrum Master')).toBe('PRODUCT')
    expect(classifyDiscipline('Chief Product Officer - Product, Growth Systems & AI')).toBe('PRODUCT')
    expect(classifyDiscipline('Product Designer')).toBe('DESIGN')
    expect(classifyDiscipline('Senior UX Designer')).toBe('DESIGN')
    expect(classifyDiscipline('System Administrator')).toBe('IT')
    expect(classifyDiscipline('Network Engineer')).toBe('IT')
    expect(classifyDiscipline('Cyber Security Analyst')).toBe('IT')
    expect(classifyDiscipline('Integration Specialist 80 - 100%')).toBe('IT')
  })

  it('drops accounting and office roles', () => {
    const titles = [
      'Accounts Officer',
      'Senior Accountant',
      'Manager, Internal Audit',
      'Finance Manager',
      'Assistant Manager - Taxation',
      'Office Assistant',
      'Front Desk Executive',
      'Executive - Admin & HR',
      'Data Entry Operator',
      'Computer Operator',
      'Receptionist',
      'Payroll Executive',
    ]
    for (const title of titles) {
      expect([title, classifyDiscipline(title)]).toEqual([title, 'OTHER'])
    }
  })

  it('drops sales, marketing and support roles', () => {
    const titles = [
      'Telesales And Customer Care Executive',
      'Digital Marketing Executive',
      'Business Development Manager',
      'Customer Service Representative',
      'Social Media Manager',
      'Content Writer',
      'Merchandiser',
      'Customer Success Manager, Enterprise',
      'Director, Partnerships',
      'Senior Insights Analyst, Strategic Partnerships',
      'Associate Manager, Strategy & Analytics - Strategic Partnerships',
      'Senior Revenue Enablement Manager, Upmarket',
      'AWS GTM Partnership Lead, Enterprise',
      'FX Controller/ Senior Controller',
      'Growth Team Lead - Australia & Oceania',
    ]
    for (const title of titles) {
      expect([title, classifyDiscipline(title)]).toEqual([title, 'OTHER'])
    }
  })

  it('drops non-software engineering, which is what Bdjobs category 5 is full of', () => {
    const titles = [
      'Site Engineer-Civil',
      'Mechanical Engineer',
      'Electrical Engineer (Factory)',
      'Textile Engineer',
      'Production Engineer',
      'Maintenance Engineer',
      'Assistant Engineer - Civil',
      'Architect',
    ]
    for (const title of titles) {
      expect([title, classifyDiscipline(title)]).toEqual([title, 'OTHER'])
    }
  })

  it('drops trades, healthcare, teaching and logistics', () => {
    const titles = [
      'Driver',
      'Chef',
      'Security Guard',
      'Staff Nurse',
      'Lecturer - Physics',
      'Supply Chain Executive',
      'Warehouse Officer',
      'Legal Advisor',
    ]
    for (const title of titles) {
      expect([title, classifyDiscipline(title)]).toEqual([title, 'OTHER'])
    }
  })

  it('lets a strong software signal beat an overlapping non-tech word', () => {
    expect(classifyDiscipline('Billing Systems Engineer')).toBe('SOFTWARE')
    expect(classifyDiscipline('Software Engineer, Marketing Platform')).toBe('SOFTWARE')
    expect(classifyDiscipline('Sales Engineering Manager')).toBe('SOFTWARE')
    expect(classifyDiscipline('Cloud Architect')).toBe('SOFTWARE')
    expect(classifyDiscipline('Full Stack Software Engineer, Growth')).toBe('SOFTWARE')
    expect(classifyDiscipline('Senior Software Engineer, Growth Enablement')).toBe('SOFTWARE')
    expect(classifyDiscipline('Principal Product Manager, AI Enablement')).toBe('PRODUCT')
  })

  it('falls back to skills when the title says nothing', () => {
    expect(classifyDiscipline('Associate', ['TypeScript', 'AWS'])).toBe('SOFTWARE')
    expect(classifyDiscipline('Associate', [])).toBe('OTHER')
    expect(classifyDiscipline('')).toBe('OTHER')
  })
})
