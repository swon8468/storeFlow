import { Tabs, Card } from 'antd';
import { FileTextOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { Contracts } from './Contracts';
import { Timesheets } from './Timesheets';
import { Payroll } from './Payroll';
import { useSession } from '../../hooks/useSession';

const { TabPane } = Tabs;

export function HR() {
  const { isFeatureDisabled, disabledFeatures } = useSession();

  // 기능 비활성화 확인
  if (isFeatureDisabled('hr')) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>
            근무/급여 기능이 비활성화되었습니다.
          </p>
          {disabledFeatures.reason && (
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              사유: {disabledFeatures.reason}
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Tabs defaultActiveKey="contracts">
      <TabPane
        tab={
          <span>
            <FileTextOutlined />
            근로계약
          </span>
        }
        key="contracts"
      >
        <Contracts />
      </TabPane>
      <TabPane
        tab={
          <span>
            <ClockCircleOutlined />
            근무시간
          </span>
        }
        key="timesheets"
      >
        <Timesheets />
      </TabPane>
      <TabPane
        tab={
          <span>
            <DollarOutlined />
            급여
          </span>
        }
        key="payroll"
      >
        <Payroll />
      </TabPane>
    </Tabs>
  );
}

