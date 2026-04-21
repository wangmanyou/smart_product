import React, { useMemo } from 'react';
import { Tree } from 'antd';
import type { TreeProps } from 'antd';

type Props = {
    selectedKey: string;
    treeData: any;
    setSelectedKey: (key: string) => void;
    handleTreeChange: (key: string) => void;
};

const TreeComp: React.FC<Props> = ({
    selectedKey,
    treeData,
    setSelectedKey,
    handleTreeChange,
}) => {

    const onSelect: TreeProps['onSelect'] = (selectedKeysValue) => {
        let value = ''
        if(selectedKeysValue && selectedKeysValue.length) {
            const nowValue: string = selectedKeysValue[0];
            if(nowValue === selectedKey) {
                value = '';
            } else {
                value = nowValue;
            }
            setSelectedKey(value);
        } else {
            value = ''
            setSelectedKey('');
        }
        handleTreeChange(value)
    };

    // 默认展开顶层节点
    const defaultExpandedKeys = useMemo(() => {
        return treeData.map(item => item.localId);
    }, [treeData]);


    return (

        <Tree
            className='self-tree'
            blockNode={true}
            selectable={true}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelect={onSelect}
            treeData={treeData}
            defaultExpandedKeys={defaultExpandedKeys}
            fieldNames={{
                title: 'name',
                key: 'localId',
                children: 'children',
            }}
        />
    );
};

export default TreeComp;