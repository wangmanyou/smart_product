import React, { useCallback, useEffect, useState } from 'react';
import { history, useParams } from '@umijs/max';
import { message, Spin } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';

import { editDictApi, getDictDetailApi } from '@/services/system/dict'


type FieldType = {
};

const CreateForm: React.FC = ({ }) => {
  const params = useParams();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = useCallback(async (values: FieldType) => {
    
  }, [params.id]);



  useEffect(() => {

  }, [params.id]);


  return (
    <PageContainer>
      <div className="h-full overflow-y-auto bg-white dict-action-page">
        <div className="w-[600px] m-auto pb-24 pt-48">
          {
            loading || !detail ? (
              <Spin spinning={true} className='w-full'/>
            ) : (
              <div></div>
            )
          }
        </div>
      </div>
    </PageContainer>

  );
};

export default CreateForm;