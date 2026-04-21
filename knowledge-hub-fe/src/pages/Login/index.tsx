import {
    LockOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    LoginForm,
    ProConfigProvider,
    ProFormCheckbox,
    ProFormText,
} from '@ant-design/pro-components';
import { message, theme, Form } from 'antd';

import { history, useModel } from '@umijs/max';

import { loginApi, getUserInfoApi } from '@/services/user/login';

import './index.less';
import { useEffect } from 'react';



export default () => {
    const { token } = theme.useToken();

    const { initialState, setInitialState } = useModel('@@initialState');


    const [form] = Form.useForm();


    const handleFinish = async (values: Record<string, any>) => {
        console.log(values);
        try {
            const { userAccount, userPassword, autoLogin } = values;
            if (autoLogin) {
                localStorage.setItem('account', userAccount);
            } else {
                localStorage.removeItem('account');
            }
            const { token } = await loginApi({
                userAccount,
                userPassword,
            })
            localStorage.setItem('accessToken', token);
            message.success('登录成功！');
            getUserInfoApi().then(res => {
                setInitialState({
                    ...initialState,
                    userInfo: res,
                })
            })
            history.push('/home');

        } catch (error: any) {
            message.error(error?.message || '登录失败，请重试！');
        }
    };

    useEffect(() => {
        const account = localStorage.getItem('account');
        if (account) {
            form?.current?.setFieldValue('userAccount', account)
        }
    }, [])

    return (
        <ProConfigProvider hashed={false}>
            <div className='bg-box'>
                <h1 className='title'>
                    知识管理系统
                </h1>
                <div className='content'>
                    <LoginForm
                        // logo="https://github.githubassets.com/favicons/favicon.png"
                        title="常州工业数字化创新研究院"
                        subTitle="欢迎登录知识管理系统"
                        onFinish={handleFinish}
                        formRef={form}
                        autoComplete="off"
                    >
                        <ProFormText
                            name="userAccount"
                            fieldProps={{
                                size: 'large',
                                prefix: <UserOutlined className={'prefixIcon'} />,
                                autoComplete: 'off',
                            }}
                            placeholder={'请输入用户名'}
                            rules={[
                                {
                                    required: true,
                                    message: '请输入用户名!',
                                },
                            ]}
                        />
                        <ProFormText.Password
                            name="userPassword"
                            fieldProps={{
                                size: 'large',
                                prefix: <LockOutlined className={'prefixIcon'} />,
                                autoComplete: 'new-password',
                                strengthText:
                                    '密码只能包含数字，大小写字母，至少6位长度',
                                statusRender: (value) => {
                                    const getStatus = () => {
                                        if (value && value.length > 12) {
                                            return 'ok';
                                        }
                                        if (value && value.length >= 6) {
                                            return 'pass';
                                        }
                                        return 'poor';
                                    };
                                    const status = getStatus();
                                    if (status === 'pass') {
                                        return (
                                            <div style={{ color: token.colorWarning }}>
                                                强度：中
                                            </div>
                                        );
                                    }
                                    if (status === 'ok') {
                                        return (
                                            <div style={{ color: token.colorSuccess }}>
                                                强度：强
                                            </div>
                                        );
                                    }
                                    return (
                                        <div style={{ color: token.colorError }}>强度：弱</div>
                                    );
                                },
                            }}
                            placeholder={'请输入密码'}
                            rules={[
                                {
                                    required: true,
                                    message: '请输入密码！',
                                },
                                {
                                    // 只能包含数字，大小写字母
                                    min: 6,
                                    pattern: /^[A-Za-z0-9]{6,}$/,
                                    message: '密码只能包含数字，大小写字母，至少6位长度',
                                },
                                {
                                    max: 50,
                                    message: '密码长度不能超过50字符',
                                }
                            ]}
                        />
                        <div
                            style={{
                                marginBlockEnd: 24,
                            }}
                        >
                            <ProFormCheckbox noStyle name="autoLogin">
                                记住账号
                            </ProFormCheckbox>
                        </div>
                    </LoginForm>
                </div>

            </div>
        </ProConfigProvider>
    );
};