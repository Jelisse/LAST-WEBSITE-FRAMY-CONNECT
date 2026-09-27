export const funnelSQL = `WITH starts AS (
 SELECT session_id,path,MIN(at) AS t0 FROM site_events
 WHERE kind='step' AND step=0 AND at>=? AND at<? GROUP BY session_id,path
), s1 AS (SELECT *, (SELECT MIN(at) FROM site_events e WHERE e.session_id=starts.session_id AND e.path=starts.path AND e.kind='step' AND e.step=1 AND e.at>=starts.t0 AND e.at<?) AS t1 FROM starts),
s2 AS (SELECT *, (SELECT MIN(at) FROM site_events e WHERE e.session_id=s1.session_id AND e.path=s1.path AND e.kind='step' AND e.step=2 AND e.at>=s1.t1 AND e.at<?) AS t2 FROM s1),
s3 AS (SELECT *, (SELECT MIN(at) FROM site_events e WHERE e.session_id=s2.session_id AND e.path=s2.path AND e.kind='step' AND e.step=3 AND e.at>=s2.t2 AND e.at<?) AS t3 FROM s2),
s4 AS (SELECT *, (SELECT MIN(at) FROM site_events e WHERE e.session_id=s3.session_id AND e.path=s3.path AND e.kind='step' AND e.step=4 AND e.at>=s3.t3 AND e.at<?) AS t4 FROM s3),
s5 AS (SELECT *, (SELECT MIN(at) FROM site_events e WHERE e.session_id=s4.session_id AND e.path=s4.path AND e.kind='step' AND e.step=5 AND e.at>=s4.t4 AND e.at<?) AS t5 FROM s4),
finished AS (SELECT *, (SELECT MIN(at) FROM site_events e WHERE e.session_id=s5.session_id AND e.path=s5.path AND e.kind='submitted' AND e.at>=s5.t5 AND e.at<?) AS submitted FROM s5)
SELECT COUNT(*) AS s0,COUNT(t1) AS s1,COUNT(t2) AS s2,COUNT(t3) AS s3,COUNT(t4) AS s4,COUNT(t5) AS s5,COUNT(submitted) AS submitted FROM finished`;
