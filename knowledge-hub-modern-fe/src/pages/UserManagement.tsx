import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { userApi } from '@/services/api';

export default function UserManagement() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await userApi.list({ pageNumber: 1, pageSize: 10 });
      const content = Array.isArray(res?.content)
        ? res.content
        : Array.isArray(res?.data?.content)
          ? res.data.content
          : Array.isArray(res?.user)
            ? res.user
            : Array.isArray(res?.users)
              ? res.users
              : [];
      setRows(content);
      setTotal(Number(res?.totalElements || res?.data?.totalElements || res?.total || content.length || 0));
    } catch (error) {
      message.error('用户数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns: ColumnsType<any> = [
    { title: '账号', width: 220, render: (_, record) => record.userAccount || record.account || '--' },
    { title: '昵称', width: 220, render: (_, record) => record.userNickname || record.nickname || '--' },
    { title: '邮箱', width: 280, render: (_, record) => record.userEmail || record.email || '--' },
    { title: '手机号', width: 180, render: (_, record) => record.userPhoneNum || record.phoneNum || record.phone_num || '--' },
    { title: '状态', width: 120, render: (_, record) => <StatusTag disabled={record.userDisabled ?? record.isDisabled} /> },
    { title: '操作', width: 120, render: () => <Button type="link">编辑</Button> },
  ];
  return (
    <PageHeader title="用户管理" breadcrumb="系统管理 / 用户管理" description="管理用户基础信息、状态和后续授权范围。" extra={<Button type="primary" icon={<PlusOutlined />}>新增用户</Button>}>
      <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
        <Table
          rowKey={(record) => record.userId || record.id || record.userAccount || record.account}
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ total, pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
        />
      </Card>
    </PageHeader>
  );
}
