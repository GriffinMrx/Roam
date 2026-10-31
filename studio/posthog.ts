import posthog from 'posthog-js'

let initialized = false

function requirePostHogConfig(value: string | undefined, variableName: string) {
  if (value) return value

  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
    )
  }

  return undefined
}

export function getPostHog() {
  if (typeof window === 'undefined') return undefined

  const key = requirePostHogConfig(
    process.env.SANITY_STUDIO_POSTHOG_KEY,
    'SANITY_STUDIO_POSTHOG_KEY',
  )
  const host = requirePostHogConfig(
    process.env.SANITY_STUDIO_POSTHOG_HOST,
    'SANITY_STUDIO_POSTHOG_HOST',
  )

  if (!key || !host) return undefined

  if (!initialized) {
    posthog.init(key, {
      api_host: host,
      defaults: '2026-08-30',
      capture_exceptions: true,
      capture_pageview: 'history_change',
      logs: {
        serviceName: 'roam-studio',
        environment: process.env.NODE_ENV ?? 'development',
      },
    })
    posthog.logger.info('studio analytics initialized', {
      event: 'studio.analytics_initialized',
    })
    initialized = true
  }

  return posthog
}
