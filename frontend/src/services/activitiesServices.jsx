import { useState } from "react";

export default function activitiesServices() {
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [refetchActivities, setRefetchActivities] = useState(true);
  const [activitiesList, setActivitiesList] = useState([]);
  const [userActivitiesList, setUserActivitiesList] = useState([]);
  const [activityNextMat, setActivityNextMat] = useState([]);
  const [activityTypeList, setActivityTypeList] = useState([]);

  const url = `${import.meta.env.VITE_API_URL}/activities`;

  const addActivity = async (activityData) => {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(activityData) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(typeof result.body === "string" ? result.body : "Não foi possível cadastrar a turma.");
    return result.body;
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

  const updateActivity = async (activityId, activityData) => {
    const response = await fetch(`${url}/${activityId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(activityData) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(typeof result.body === "string" ? result.body : "Não foi possível atualizar a turma.");
    return result.body;
  };

  const deleteActivity = async (activityId) => {
    try {
      const response = await fetch(`${url}/${activityId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (!result.success) {
        console.log(result);
      }
      return result;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  return {
    addActivity,
    getActivities,
    getActivitiesByMat,
    getActivitiesByType,
    getActivityNextMat,
    updateActivity,
    deleteActivity,
    activitiesLoading,
    refetchActivities,
    userActivitiesList,
    activitiesList,
    activityNextMat,
    activityTypeList
  };
}
