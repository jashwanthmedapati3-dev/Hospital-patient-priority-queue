/**
 * Format seconds into human-readable waiting time.
 */
export function formatWaitingTime(arrivalTimestamp) {
  if (!arrivalTimestamp) return '—'
  const now = Date.now() / 1000
  const diff = Math.max(0, now - arrivalTimestamp)
  const mins = Math.floor(diff / 60)
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60

  if (hours > 0) {
    return `${hours}h ${remainMins}m`
  }
  if (mins > 0) {
    return `${mins}m`
  }
  return '< 1m'
}

export function formatWaitTimeShort(arrivalTimestamp) {
  if (!arrivalTimestamp) return '—'
  const now = Date.now() / 1000
  const diff = Math.max(0, now - arrivalTimestamp)
  const mins = Math.floor(diff / 60)
  return `~${mins}m`
}

export function getPriorityTag(patient) {
  if (!patient) return { label: 'P3 Urgent', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' }
  const level = (patient.emergency_level || '').toUpperCase()
  const score = patient.priority_score || 50

  if (level === 'CRITICAL' || score >= 90) {
    return { label: 'P5 Critical', fullLabel: 'Priority 5 — Critical', color: '#ff3366', bg: 'rgba(255, 51, 102, 0.18)', border: '#ff3366' }
  }
  if (level === 'HIGH' || score >= 75) {
    return { label: 'P4 Very Urgent', fullLabel: 'Priority 4 — Very Urgent', color: '#f97316', bg: 'rgba(249, 115, 22, 0.18)', border: '#f97316' }
  }
  if (level === 'MEDIUM' || score >= 55) {
    return { label: 'P3 Urgent', fullLabel: 'Priority 3 — Urgent', color: '#eab308', bg: 'rgba(234, 179, 8, 0.18)', border: '#eab308' }
  }
  return { label: 'P2 Moderate', fullLabel: 'Priority 2 — Moderate', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)', border: '#3b82f6' }
}

/**
 * Get badge CSS class for emergency level.
 */
export function getLevelBadgeClass(level) {
  const map = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }
  return map[level] || 'badge-low'
}

/**
 * Get badge CSS class for patient status.
 */
export function getStatusBadgeClass(status) {
  const map = {
    WAITING: 'badge-waiting',
    IN_TREATMENT: 'badge-in-treatment',
    COMPLETED: 'badge-completed',
    CANCELLED: 'badge-completed',
  }
  return map[status] || 'badge-waiting'
}

/**
 * Get color for emergency level.
 */
export function getLevelColor(level) {
  const map = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
  }
  return map[level] || '#64748b'
}

/**
 * Get score bar color.
 */
export function getScoreColor(score) {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#eab308'
  return '#3b82f6'
}

/**
 * Get initials from a name.
 */
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get event type badge class.
 */
export function getEventBadgeClass(eventType) {
  if (eventType.includes('REGISTERED')) return 'event-registered'
  if (eventType.includes('ADDED')) return 'event-added'
  if (eventType.includes('TREATED')) return 'event-treated'
  if (eventType.includes('ESCALATED')) return 'event-escalated'
  if (eventType.includes('COMPLETED')) return 'event-completed'
  if (eventType.includes('CANCELLED')) return 'event-cancelled'
  if (eventType.includes('UPDATED')) return 'event-updated'
  return 'event-registered'
}

/**
 * Format ISO timestamp.
 */
export function formatTimestamp(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
