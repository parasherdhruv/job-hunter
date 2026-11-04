import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusSelect } from '@/components/status-select';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { jobs: { updateStatus: jest.fn() } } };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api } = jest.requireMock('@/lib/api') as {
  api: { jobs: { updateStatus: jest.Mock } };
};

describe('StatusSelect', () => {
  beforeEach(() => api.jobs.updateStatus.mockReset());

  it('persists a status change and reports it to the parent', async () => {
    api.jobs.updateStatus.mockResolvedValue({ id: 'job-1', status: 'INTERVIEW' });
    const onChange = jest.fn();

    render(<StatusSelect jobId="job-1" value="SAVED" onChange={onChange} />);

    await userEvent.selectOptions(
      screen.getByLabelText('Application status'),
      'INTERVIEW',
    );

    expect(api.jobs.updateStatus).toHaveBeenCalledWith('job-1', 'INTERVIEW');
    await screen.findByDisplayValue('Interview');
    expect(onChange).toHaveBeenCalledWith('INTERVIEW');
  });

  it('rolls back the selection when the API rejects the change', async () => {
    api.jobs.updateStatus.mockRejectedValue(new Error('nope'));

    render(<StatusSelect jobId="job-1" value="SAVED" />);

    const select = screen.getByLabelText('Application status') as HTMLSelectElement;
    await userEvent.selectOptions(select, 'OFFER');

    expect(await screen.findByText('Could not update status.')).toBeInTheDocument();
    expect(select.value).toBe('SAVED');
  });
});
