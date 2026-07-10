import React, { useMemo, useCallback } from 'react';
import { Popconfirm, Tooltip, Dropdown, Divider, Space, message } from 'antd';
import {
    FormOutlined, DeleteOutlined, ShareAltOutlined, SettingOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';

import { delKnowledgeApi } from '@/services/business';
import { SceneType } from '@/constants/type';

import { findTreeDictById, findPlaneDictById } from '@/utils/business';

function copyHtmlToClipboard(htmlContent, text) {

    if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobPlainText = new Blob([text], { type: 'text/plain' });

        const clipboardItem = new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobPlainText,
        });
        navigator.clipboard.write([clipboardItem]).then(() => {
            message.success('内容已成功复制');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;  // 复制纯文本

        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy'); // 执行复制
            message.success('内容已成功复制');
        } catch (err) {
            console.error('复制失败:', err);
        } finally {
            document.body.removeChild(textarea); // 清理
        }
    }

}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createHtml(data: any, record: any, alllen: number, html: any) {
    let len = alllen;

    for (let item of data) {
        if(len < 0) {
            break
        }
        const { sceneItemName, sceneItemType, sceneItemValue, sceneItemSelectDictTreeIds } = record[item.id]
        if (sceneItemType === SceneType.dict) {
            if (sceneItemSelectDictTreeIds) {
                const val = JSON.parse(sceneItemSelectDictTreeIds);
                let result = ''
                if (item.dictType === 'plane') {
                    const names = findPlaneDictById(item.dict, val);
                    if (names && names.length) {
                        result = names.join('，')
                    }
                } else {
                    const names = findTreeDictById(item.dict, val);
                    if (names && Array.isArray(names)) {
                        result = names.join('，')
                    } else if (names) {
                        result = names;
                    }
                }
                if (result) {
                    html.push({
                        name: sceneItemName,
                        value: result,
                    })
                    len--
                }

            }
        } else if(item.dictType === SceneType.text){
            if (sceneItemValue && sceneItemValue.length) {
                html.push({
                    name: sceneItemName,
                    value: sceneItemValue[0],
                })
                
                len--
            }
        } else if(item.dictType === SceneType.datetime){
            if (sceneItemValue && sceneItemValue.length) {
                html.push({
                    name: sceneItemName,
                    value: sceneItemValue.join('，'),
                })
                len--
            }

        } else if(item.dictType === SceneType.decimal || sceneItemType === SceneType.integer) {
            if (sceneItemValue && sceneItemValue.length) {
                html.push({
                    name: sceneItemName,
                    value: sceneItemValue.join('，'),
                })
                len--
            }
        }
    }
    return {
        html, 
        len,
    }
}
interface Props {
    businessId: number;
    knowledgeId: number;
    record: any;
    sceneData: any;
    isDisabled: boolean;
    children: React.ReactNode;
    handleSetting: (values: any) => void;
    handleRefresh: (type: string) => void;
    [x: string]: any
}
const DropdownAction: React.FC<Props> = ({
    businessId,
    knowledgeId,
    children,
    isDisabled = false,
    record,
    sceneData,
    handleSetting,
    handleRefresh,
}) => {

    // 分享
    const handleShare = () => {
        const detailurl = window.location.origin + `/business/${businessId}/knowledge/${knowledgeId}`;
        const searchDataAbled: any = []
        const searchDataDisabled: any = []
        sceneData.forEach(scene => {
            if (scene.isSupportSearch) {
                searchDataAbled.push(scene)
            } else {
                searchDataDisabled.push(scene)
            }
        })
        let html: any = []
        let len = 3
        if (searchDataAbled && searchDataAbled.length > 0) {
            const { html: nowHtml, len: nowLen } = createHtml(searchDataAbled, record, len, html)
            html = nowHtml;
            len = nowLen;
        }
        if(len > 0 && searchDataDisabled && searchDataDisabled.length > 0) {
            const { html: nowHtml, len: nowLen } = createHtml(searchDataDisabled, record, len, html)
            html = nowHtml;
            len = nowLen;
        }

        const crhtml = html.map(item => {
            return `<div>${item.name}：${item.value}</div>`
        }).join('')

        const crtext = html.map(item => `${item.name}：${item.value}`).join('\n')

        const resultHtml = `<div>${crhtml}
                    <div>创建人： ${escapeHtml(record.creatorName)}</div>
                    <a href=${escapeHtml(detailurl)} 
                        target='_blank'>知识详情： ${escapeHtml(detailurl)}</a>
                </div>`
        const text = `${crtext}\n创建人： ${escapeHtml(record.creatorName)}\n知识详情：${escapeHtml(detailurl)}`
        
        
        copyHtmlToClipboard(resultHtml, text)
    }

    // 删除
    const handleDel = useCallback(async () => {
        try {
            await delKnowledgeApi(knowledgeId);
            handleRefresh('del');
        } catch (error) {
            message.error(error?.msg || '删除失败');
        }
    }, [knowledgeId]);

    const dropdownItems = useMemo(() => {
        return [{
            key: '1',
            label: (
                <Space split={<Divider type="vertical" />}>
                    <Tooltip title="分享" placement='top'>
                        <span
                            onClick={handleShare}
                            className="text-link cursor-pointer"
                        >
                            <ShareAltOutlined style={{ color: 'var(--green)' }} />
                        </span>
                    </Tooltip>
                    {
                        !isDisabled && (
                            <Tooltip title="编辑" placement='top'>
                                <span
                                    onClick={() =>
                                        history.push(`/business/${businessId}/edit/${knowledgeId}`)
                                    }
                                    className="text-link cursor-pointer"
                                >
                                    <FormOutlined style={{ color: 'var(--primary)' }} />
                                </span>
                            </Tooltip>
                        )
                    }


                    <Popconfirm
                        title="删除"
                        description="确定要删除这条内容吗?"
                        onConfirm={handleDel}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Tooltip title="删除" placement='top'>
                            <span
                                className="text-link cursor-pointer"
                            >
                                <DeleteOutlined style={{ color: 'var(--error-color)' }} />
                            </span>
                        </Tooltip>
                    </Popconfirm>
                    <Tooltip title="配置" placement='top'>
                        <span
                            onClick={() => handleSetting(record)}
                            className="text-link cursor-pointer"
                        >
                            <SettingOutlined />
                        </span>
                    </Tooltip>

                </Space>
            ),
        }]
    }, [knowledgeId, record])

    return (
        <Dropdown menu={{ items: dropdownItems }} placement="topRight">
            {children}

        </Dropdown>
    );
};
export default DropdownAction;
