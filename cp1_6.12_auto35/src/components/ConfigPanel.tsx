import React, { useState, useMemo } from 'react';
import { useNetworkStore } from '../store';
import { isValidIP, isValidSubnetMask, getSubnet } from '../types';

interface FieldState {
  value: string;
  touched: boolean;
}

export const ConfigPanel: React.FC = () => {
  const {
    configPanelOpen,
    selectedDeviceId,
    devices,
    closeConfigPanel,
    updateDeviceConfig,
  } = useNetworkStore();

  const device = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId) || null,
    [devices, selectedDeviceId]
  );

  const [fields, setFields] = useState<Record<string, FieldState>>({
    ip: { value: device?.config.ip || '', touched: false },
    subnetMask: { value: device?.config.subnetMask || '', touched: false },
    gateway: { value: device?.config.gateway || '', touched: false },
  });

  React.useEffect(() => {
    if (device) {
      setFields({
        ip: { value: device.config.ip, touched: false },
        subnetMask: { value: device.config.subnetMask, touched: false },
        gateway: { value: device.config.gateway, touched: false },
      });
    }
  }, [device?.id]);

  if (!device || !configPanelOpen) return null;

  const ipValid = isValidIP(fields.ip.value) && fields.ip.value !== '';
  const maskValid = isValidSubnetMask(fields.subnetMask.value);
  const gatewayValid = isValidIP(fields.gateway.value) || fields.gateway.value === '';

  const handleChange = (field: keyof typeof fields, value: string) => {
    setFields((prev) => ({
      ...prev,
      [field]: { value, touched: true },
    }));
    updateDeviceConfig(device.id, { [field]: value });
  };

  const inputStyle = (valid: boolean, touched: boolean) => ({
    width: '100%',
    padding: '10px 12px',
    border: `2px solid ${!valid && touched ? '#ef4444' : '#cbd5e1'}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: '#fff',
    fontFamily: 'Consolas, Monaco, monospace',
  });

  const labelStyle = {
    display: 'block' as const,
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '6px',
  };

  const errorStyle = {
    fontSize: '11px',
    color: '#ef4444',
    marginTop: '4px',
    minHeight: '14px',
  };

  const calculatedSubnet =
    ipValid && maskValid ? getSubnet(fields.ip.value, fields.subnetMask.value) : null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '30%',
        minWidth: 320,
        maxWidth: 420,
        height: '100%',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.08)',
        transform: configPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 24px',
          background: device.type === 'pc'
            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
            {device.type === 'pc' ? '电脑终端' : '路由器'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            {device.name}
          </div>
        </div>
        <button
          onClick={closeConfigPanel}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.35)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '24px', overflowY: 'auto' as const, flex: 1 }}>
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: calculatedSubnet ? '#ecfdf5' : '#fef3c7',
              border: `1px solid ${calculatedSubnet ? '#10b981' : '#f59e0b'}`,
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
              当前网络地址
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: 'Consolas, monospace',
                color: calculatedSubnet ? '#065f46' : '#92400e',
              }}
            >
              {calculatedSubnet ? `${calculatedSubnet}/24` : '请填写IP和掩码'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>IP 地址</label>
          <input
            type="text"
            value={fields.ip.value}
            onChange={(e) => handleChange('ip', e.target.value)}
            placeholder="例如：192.168.1.1"
            style={inputStyle(ipValid, fields.ip.touched)}
          />
          <div style={errorStyle}>
            {!ipValid && fields.ip.touched && '请输入有效的IP地址（四段0-255数字）'}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>子网掩码</label>
          <input
            type="text"
            value={fields.subnetMask.value}
            onChange={(e) => handleChange('subnetMask', e.target.value)}
            placeholder="例如：255.255.255.0"
            style={inputStyle(maskValid, fields.subnetMask.touched)}
          />
          <div style={errorStyle}>
            {!maskValid && fields.subnetMask.touched && '请输入有效的子网掩码'}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>
            默认网关 {device.type === 'router' && <span style={{ fontWeight: 400, color: '#94a3b8' }}>（可选）</span>}
          </label>
          <input
            type="text"
            value={fields.gateway.value}
            onChange={(e) => handleChange('gateway', e.target.value)}
            placeholder="例如：192.168.1.254"
            style={inputStyle(gatewayValid, fields.gateway.touched)}
          />
          <div style={errorStyle}>
            {!gatewayValid && fields.gateway.touched && '网关格式无效'}
          </div>
          {device.type === 'pc' && fields.gateway.touched && fields.gateway.value === '' && (
            <div style={{ ...errorStyle, color: '#f59e0b' }}>建议配置网关以支持跨子网通信</div>
          )}
        </div>

        <div
          style={{
            marginTop: '28px',
            padding: '16px',
            background: '#f1f5f9',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
            快速配置参考
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '11px',
              color: '#64748b',
            }}
          >
            <div>
              <span style={{ color: '#475569', fontWeight: 600 }}>同子网PC：</span>
              <br />
              IP前三段相同
            </div>
            <div>
              <span style={{ color: '#475569', fontWeight: 600 }}>跨子网：</span>
              <br />
              配置正确网关
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
