import { Tag } from 'antd';

export default function StatusTag({
  disabled,
  used,
}: {
  disabled?: boolean;
  used?: boolean;
}) {
  if (disabled) return <Tag color="red">已禁用</Tag>;
  if (used === false) return <Tag color="orange">未使用</Tag>;
  return <Tag color="green">正常</Tag>;
}
