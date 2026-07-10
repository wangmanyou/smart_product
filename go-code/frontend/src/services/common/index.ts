import { request } from '@umijs/max';

export async function downloadFileApi(fileUrl: string) {
    return request(fileUrl, {
        method: 'GET',
    });
}