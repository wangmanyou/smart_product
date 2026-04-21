import React, { useCallback } from 'react';
import { history } from '@umijs/max';
import { message } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';


const CreateForm: React.FC = ({ }) => {

    const handleSubmit = useCallback(async (values: any) => {
        console.log('create', values);
        // 提交
        
    }, []);

    return (
        <PageContainer>
            <div className="h-full overflow-y-auto bg-white dict-action-page">
                <div className="w-[600px] m-auto pb-24 pt-48">
                    
                </div>
            </div>
        </PageContainer>

    );
};

export default CreateForm;