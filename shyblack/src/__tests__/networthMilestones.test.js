import { describe, it, expect } from 'vitest'
import {
  NET_WORTH_MILESTONES,
  getLatestMilestone,
  getNextMilestone,
  getMilestoneProgress,
  getNewMilestone,
} from '../utils/networthMilestones'

describe('networthMilestones', () => {
  it('finds the highest crossed milestone', () => {
    expect(getLatestMilestone(150000)).toMatchObject({ id: '1l', value: 100000 })
    expect(getLatestMilestone(1200000)).toMatchObject({ id: '10l', value: 1000000 })
    expect(getLatestMilestone(5000)).toBeNull()
    expect(getLatestMilestone(-100)).toBeNull()
  })

  it('exposes the next milestone and progress', () => {
    expect(getNextMilestone(60000)).toMatchObject({ id: '1l', value: 100000 })
    const progress = getMilestoneProgress(75000)
    expect(progress.current).toMatchObject({ id: '50k' })
    expect(progress.next).toMatchObject({ id: '1l' })
    expect(progress.progress).toBe(50)
  })

  it('detects only newly crossed milestones', () => {
    expect(getNewMilestone(120000, 50000)).toMatchObject({ id: '1l', value: 100000 })
    expect(getNewMilestone(120000, 100000)).toBeNull()
    expect(getNewMilestone(20000, 50000)).toBeNull()
    expect(getNewMilestone(200000, 100000)).toMatchObject({ id: '2l' })
  })

  it('has ascending ordered milestones', () => {
    for (let i = 1; i < NET_WORTH_MILESTONES.length; i++) {
      expect(NET_WORTH_MILESTONES[i].value).toBeGreaterThan(NET_WORTH_MILESTONES[i - 1].value)
    }
  })
})