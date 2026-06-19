import { getReportGroupAccessApi, putReportGroupAccessApi } from "../services/reportGroupAccessApi";

export const fetchReportGroupAccess = async () => {
  const res = await getReportGroupAccessApi();
  return res.data;
};

export const saveUserReportGroupAccess = async (userId, reportGroupCodes) => {
  const res = await putReportGroupAccessApi({
    user_id: userId,
    report_group_codes: reportGroupCodes,
  });
  return res.data;
};
