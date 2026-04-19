import { Component, type ErrorInfo, type ReactNode } from 'react';

interface MapRenderBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface MapRenderBoundaryState {
  hasError: boolean;
}

export class MapRenderBoundary extends Component<
  MapRenderBoundaryProps,
  MapRenderBoundaryState
> {
  state: MapRenderBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): MapRenderBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[CrowdIQ] Interactive map crashed', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
