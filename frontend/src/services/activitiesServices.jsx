import { useState } from "react";

export default function activitiesServices() {
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [refetchActivities, setRefetchActivities] = useState(true);
  const [activitiesList, setActivitiesList] = useState([]);
  const [userActivitiesList, setUserActivitiesList] = useState([]);
  const [activityNextMat, setActivityNextMat] = useState([]);
  const [activityTypeList, setActivityTypeList] = useState([]);

  const url = `${import.meta.env.VITE_API_URL}/activities`;

  const addActivity = (activityData) => {

    fetch(`${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activityData),
    })
      .then((response) => response.json())
      .then((result) => {
        //if (result.success) {
        //  setTablesList(result.body);
        //} else {
        //console.log(result);
        //}
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
      });
  };

  const getActivities = () => {
    setActivitiesLoading(true);

    fetch(`${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setActivitiesList(result.body);
        } else {
          //console.log(result);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
        setActivitiesLoading(false);
        setRefetchActivities(false);
      });
  };

  const getActivitiesByMat = (activities) => {
    setActivitiesLoading(true);

    fetch(`${url}/activitiesByMat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_activities: activities }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setUserActivitiesList(result.body);
        } else {
          //console.log(result);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
        setActivitiesLoading(false);
        setRefetchActivities(false);
      });
  };

  const getActivitiesByType = (type) => {
    setActivitiesLoading(true);

    fetch(`${url}/activitiesByType`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activity_type: type }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setActivityTypeList(result.body);
        } else {
          //console.log(result);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
        setActivitiesLoading(false);
        setRefetchActivities(false);
      });
  };

  const getActivityNextMat = () => {

    fetch(`${url}/nextMat`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setActivityNextMat(result.body);
        } else {
          //console.log(result);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
        setActivitiesLoading(false);
        setRefetchActivities(false);
      });
  };

  const updateActivity = (activityId, activityData) => {

    console.log(activityData)
    console.log(JSON.stringify(activityData))

    fetch(`${url}/${activityId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activityData)
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
        } else {
          //console.log(result);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
      });
  };

  return {
    addActivity,
    getActivities,
    getActivitiesByMat,
    getActivitiesByType,
    getActivityNextMat,
    updateActivity,
    activitiesLoading,
    refetchActivities,
    userActivitiesList,
    activitiesList,
    activityNextMat,
    activityTypeList
  };
}
