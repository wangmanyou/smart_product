import {
    ProFormDateTimePicker,
    ProFormDateTimeRangePicker,
    ProFormText,
    ProFormDigit,
    QueryFilter,
} from '@ant-design/pro-components';
import React, { useMemo, useImperativeHandle } from 'react';
import { SceneType } from '@/constants/type';
import { Form } from 'antd';


const disabledSearch = [
    SceneType.dict,
    SceneType.audio,
    SceneType.file,
    SceneType.picture,
    SceneType.video,
]


const formatSearchParams = (sceneData, values) => {
    const result = [];

    sceneData.forEach((scene) => {
        const { id, type } = scene;
        if (values[id]) {
            if(type === SceneType.decimal) {
                const v = values[id].toString();
                const rv = !!v ? v.indexOf('.') >=0 ? [v] : [v+'.0'] : [];
                result.push({
                    sceneItemId: id,
                    sceneItemValue: rv,
                })
            } else if(type === SceneType.integer) {
                
                result.push({
                    sceneItemId: id,
                    sceneItemValue: [values[id]+''],
                })
            } else if(type === SceneType.datetime) {
                const v = values[id];
                const rv = !!v ? Array.isArray(v) ? v : [v] : [];
                result.push({
                    sceneItemId: id,
                    sceneItemValue: rv,
                })
            } else if(type === SceneType.text) {
                result.push({
                    sceneItemId: id,
                    sceneItemValue: values[id] ? [values[id]] : [],
                })
            } else {
                result.push({
                    sceneItemId: id,
                    sceneItemValue: values[id],
                })
            }
            
        }
    })
    const params: any = {
        searchKnowledgeItem: result,
        pageNumber: 1,
    };
    if (values.searchCreateTime) {
        params.searchCreateTime = values.searchCreateTime;
    }
    if (values.searchUpdateTime) {
        params.searchUpdateTime = values.searchUpdateTime;
    }
    if (values.searchCreatorId) {
        params.searchCreatorId = values.searchCreatorId;
    }
    

    return params
}

const DetailSearchPanel = React.forwardRef(({
    sceneData,
    handleSearch,
}, ref) => {
    const [form] = Form.useForm()

    useImperativeHandle(ref, () => ({
        getCurrentValues() {
            const values = form.getFieldsValue();
            const params = formatSearchParams(sceneData, values);
            return params
        },
    }));

    const formInfo = useMemo(() => {
        const result = sceneData?.map((item) => {
            const { type, id, multiValue, sceneItemName, isSupportSearch } = item;
            if (!disabledSearch.includes(type) && isSupportSearch) {
                switch (type) {
                    case SceneType.text:
                        return (
                            <ProFormText
                                key={id}
                                name={id}
                                label={sceneItemName} />
                        )
                    case SceneType.datetime: {
                        if (!multiValue) {
                            return (
                                <ProFormDateTimePicker
                                    key={id}
                                    name={id}
                                    label={sceneItemName} />
                            )
                        }
                        return <ProFormDateTimeRangePicker key={id} name={id} label={sceneItemName} />

                    }

                    case SceneType.integer:
                        return (
                            <ProFormDigit
                                key={id}
                                name={id}
                                label={sceneItemName}
                                fieldProps={{ precision: 0 }}
                            />
                        )
                    case SceneType.decimal:
                        return (
                            <ProFormDigit
                                key={id}
                                name={id}
                                label={sceneItemName}
                            />
                        )
                }
            }
            return null;
        })
        return result?.filter(Boolean);
    }, [sceneData]);

    const handleFinish = (values: any) => {
        const params = formatSearchParams(sceneData, values);
        handleSearch(params);
    }

    return (
        <QueryFilter
            form={form}
            layout="horizontal"
            defaultCollapsed
            split
            onFinish={handleFinish}>
            {formInfo}
            <ProFormDateTimeRangePicker name="searchCreateTime" label="创建时间" />
            <ProFormDateTimeRangePicker name="searchUpdateTime" label="更新时间" />
            <ProFormText name="searchCreatorId" label="创建人Id" />
        </QueryFilter>
    );
})

export default DetailSearchPanel;
