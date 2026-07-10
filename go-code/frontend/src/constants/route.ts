export type RouteScope =
    | { type: 'businessList' }
    | { type: 'businessDetail'; businessId: string }
    | { type: 'other' };

export function getRouteScope(pathname: string): RouteScope {
    if (pathname === '/business/list') {
        return { type: 'businessList' };
    }

    const match = pathname.match(/^\/business\/([^/]+)/);
    if (match) {
        return {
            type: 'businessDetail',
            businessId: match[1],
        };
    }

    return { type: 'other' };
}
