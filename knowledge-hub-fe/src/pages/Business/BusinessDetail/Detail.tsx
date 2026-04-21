import { Tag, Card, Image, Divider } from 'antd';
import React, { useMemo } from 'react';

import Title from './Title';
import { SceneType } from '@/constants/type';

import dayjs from 'dayjs';

import { findPlaneDictById, findTreeDictById, getFilenameByPath } from '@/utils/business';

import DownloadFile from '@/components/DownloadFile';
import DefaultFile from '@/components/DefaultFile';

interface Props {
    detail: any;
    sceneData: any;
    [x: string]: any
}
const Detail: React.FC<Props> = ({
    detail,
    sceneData,
}) => {
    const { creatorName, viewTime, updateTime, createTime, knowledgeShow } = detail;

    const detailHmtl = useMemo(() => {
        return sceneData?.map(item => {
            const { type, id, isHide, dictType, sceneItemName } = item;
            const sceneItemValue = knowledgeShow[id];

            if (isHide) {
                return null
            }
            if (type !== SceneType.dict && (!sceneItemValue || !sceneItemValue.length)) {
                return (
                    <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                        <Title>{sceneItemName}:</Title>
                        <div className='text-center text-text-4 py-8'>暂无数据</div>
                    </div>
                )
            }
            if (type === SceneType.dict) {
                const val = JSON.parse(sceneItemValue || '[]');
                if (!sceneItemValue || !val.length) {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='text-center text-text-4 py-8'>暂无数据</div>
                        </div>
                    )
                }
            }
            switch (type) {
                case SceneType.text: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24'>{sceneItemValue[0]}</div>
                        </div>
                    )
                }
                case SceneType.datetime: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24'>
                                {sceneItemValue.length > 1 ? sceneItemValue.join(' 至 ') : sceneItemValue.pop()}
                            </div>
                        </div>
                    )
                }
                case SceneType.integer: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24 flex flex-wrap gap-8'>
                                {
                                    sceneItemValue.map((value: string, index: number) => <Tag key={index}>{value}</Tag>)
                                }
                            </div>
                        </div>
                    )
                }
                case SceneType.decimal: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24 flex flex-wrap gap-8'>
                                {
                                    sceneItemValue.map((value: string, index: number) => <Tag key={index}>{value}</Tag>)
                                }
                            </div>
                        </div>
                    )
                }

                case SceneType.dict: {
                    const val = JSON.parse(sceneItemValue || '[]');
                    let result = [];
                    
                    if (dictType === 'plane') {
                        result = findPlaneDictById(item.dict, val);

                    } else {
                        const names = findTreeDictById(item.dict, val);
                        if (names && Array.isArray(names)) {
                            result = names;
                        } else if(names) {
                            result = [names]
                        } else {
                            result = [];
                            
                        }
                    }

                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24 flex flex-wrap gap-8'>
                                {
                                    result.map((value: string, index: number) => <Tag key={index}>{value}</Tag>)
                                }
                            </div>
                        </div>
                    )
                }

                case SceneType.picture: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24 flex flex-wrap gap-16'>
                                {sceneItemValue.map((imginfo: string, index: number) => (
                                    <div key={index} className="bg-bg-4 p-8 rounded-lg hover:bg-bg-blueBg">
                                        <div className='pb-4'>
                                            <DownloadFile filePath={imginfo}>{getFilenameByPath(imginfo)}</DownloadFile>
                                        </div>
                                        <Image key={index} width={100} height={100} src={imginfo} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                case SceneType.audio: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24 flex flex-wrap gap-16'>
                                {sceneItemValue.map((imginfo: string, index: number) => (
                                    <div key={index} className="bg-bg-4 p-8 rounded-lg hover:bg-bg-blueBg">
                                        <div className='pb-4'>
                                            <DownloadFile filePath={imginfo}>{getFilenameByPath(imginfo)}</DownloadFile>
                                        </div>
                                        <audio key={index} width={100} height={100} controls src={imginfo} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
                case SceneType.video: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <div className='py-16 px-24 flex flex-wrap gap-16'>
                                {sceneItemValue.map((imginfo: string, index: number) => (
                                    <div key={index} className="bg-bg-4 p-8 rounded-lg hover:bg-bg-blueBg">
                                        <div className='pb-4'>
                                            <DownloadFile filePath={imginfo}>{getFilenameByPath(imginfo)}</DownloadFile>
                                        </div>
                                        <video height={100} controls src={imginfo} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
                case SceneType.file: {
                    return (
                        <div key={id} className='w-full border border-solid border-qaGray-200 rounded-lg hover:border-primary'>
                            <Title>{sceneItemName}:</Title>
                            <DefaultFile data={sceneItemValue} classnames="px-24"/>
                        </div>
                    )
                }
                default: ''
            }
        }).filter(Boolean)
    }, [sceneData, detail])

    return (
        <section className='w-full pb-24'>
            <div className='w-full flex gap-16'>
                <Card className='w-1/4'>
                    <Title type="default">创建人:</Title>
                    <div>{creatorName}</div>
                </Card>
                <Card className='w-1/4'>
                    <Title type="default">点击次数:</Title>
                    <div>{viewTime}</div>
                </Card>
                <Card className='w-1/4'>
                    <Title type="default">创建时间:</Title>
                    <div>{dayjs(Number(createTime || 0) * 1000).format('YYYY-MM-DD HH:mm:ss')}</div>
                </Card>
                <Card className='w-1/4'>
                    <Title type="default">更新时间:</Title>
                    <div>{dayjs(Number(updateTime || 0) * 1000).format('YYYY-MM-DD HH:mm:ss')}</div>
                </Card>
            </div>
            <div className='flex flex-col gap-16 pt-16'>
                {detailHmtl}
            </div>
        </section>

    );
};
export default Detail;