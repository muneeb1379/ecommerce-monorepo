import { Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Center, Loader } from '@mantine/core'

/** Wraps a lazily-imported page so each route ships its own chunk. */
export function lazyRoute(Component: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense
      fallback={
        <Center h={300}>
          <Loader />
        </Center>
      }
    >
      <Component />
    </Suspense>
  )
}
