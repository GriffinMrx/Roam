import {useEffect} from 'react'
import type {DocumentActionComponent, LayoutProps} from 'sanity'
import {useCurrentUser} from 'sanity'
import {getPostHog} from './posthog'

const actionEvents: Record<string, string> = {
  publish: 'document_publish_requested',
  unpublish: 'document_unpublish_requested',
  delete: 'document_delete_requested',
  discardChanges: 'document_changes_discard_requested',
  duplicate: 'document_duplicate_requested',
}

export function PostHogLayout(props: LayoutProps) {
  const currentUser = useCurrentUser()

  useEffect(() => {
    if (!currentUser) return

    const posthog = getPostHog()
    if (!posthog) return

    posthog.identify(currentUser.id, {
      email: currentUser.email,
      name: currentUser.name,
      roles: currentUser.roles.map((role) => role.name),
    })
    posthog.capture('studio_loaded', {
      role_count: currentUser.roles.length,
    })
    posthog.logger.info('editor session initialized', {
      event: 'studio.editor_session_initialized',
      role_count: currentUser.roles.length,
    })
  }, [currentUser])

  return props.renderDefault(props)
}

export function withPostHogDocumentAction(Action: DocumentActionComponent) {
  const TrackedAction: DocumentActionComponent = (props) => {
    const action = Action(props)
    const eventName = Action.action ? actionEvents[Action.action] : undefined

    if (!action?.onHandle || !eventName) return action

    return {
      ...action,
      onHandle: () => {
        const posthog = getPostHog()
        const context = {
          action_type: Action.action ?? 'unknown',
          document_type: props.type,
          has_draft: Boolean(props.draft),
          has_published_version: Boolean(props.published),
        }

        posthog?.capture(eventName, context)
        posthog?.logger.info('document action requested', {
          event: 'studio.document_action_requested',
          ...context,
        })
        action.onHandle?.()
      },
    }
  }

  TrackedAction.action = Action.action
  TrackedAction.displayName = `PostHog(${Action.displayName ?? Action.action ?? 'DocumentAction'})`

  return TrackedAction
}
